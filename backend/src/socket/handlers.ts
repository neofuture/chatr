import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { generateAIReply } from '../services/openai';
import {
  setPresence,
  getPresence,
  removePresence,
  setSocketMapping,
  getSocketId,
  removeSocketMapping,
  getAllOnlineUserIds,
  getMultiplePresences,
  invalidateConversationCache,
  PresenceData,
} from '../lib/redis';
import {
  getOrCreateConversation,
  acceptConversation,
  findConversation,
  getConnectedUserIds,
  getBlockBetween,
} from '../lib/conversation';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  displayName?: string | null;
  profileImage?: string | null;
}

export function setupSocketHandlers(io: Server) {
  // Middleware for JWT authentication
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        console.warn('⚠️  WebSocket connection attempt without token');
        return next(new Error('Authentication error: No token provided'));
      }

      let decoded: { userId: string };
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
      } catch (jwtError) {
        console.error('❌ JWT verification failed:', jwtError instanceof Error ? jwtError.message : 'Unknown error');
        return next(new Error('Authentication error: Invalid token'));
      }

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, username: true, email: true, profileImage: true, displayName: true }
      });

      if (!user) {
        console.warn(`⚠️  WebSocket auth failed: User ${decoded.userId} not found in database`);
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user.id;
      socket.username = user.username;
      socket.displayName = user.displayName;
      socket.profileImage = user.profileImage;

      console.log(`✅ User authenticated via WebSocket: ${user.username} (${user.id})`);
      next();
    } catch (error) {
      console.error('❌ WebSocket auth error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const username = socket.username!;
    const displayName = socket.displayName ?? null;
    let profileImage = socket.profileImage ?? null;

    console.log(`🔌 User connected: ${username} (${socket.id})`);

    // Load the user's online-status preference from DB
    let hideOnlineStatus = false;
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { showOnlineStatus: true },
      });
      hideOnlineStatus = user ? !user.showOnlineStatus : false;
    } catch (e) {
      console.error('❌ Error loading showOnlineStatus:', e);
    }

    // Store user connection in Redis
    await setSocketMapping(userId, socket.id);
    await setPresence({
      userId,
      socketId: socket.id,
      status: 'online',
      lastSeen: new Date().toISOString(),
      hideOnlineStatus,
    });

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Broadcast online status only to connected users (friends / conversations / pending recipients)
    // Exclude users to whom we only have a pending outgoing friend request
    // (recipient should not see requester's online status until accepted)
    const { all: connectedIds, pendingInitiatedByMe } = await getConnectedUserIds(userId);
    if (!hideOnlineStatus) {
      for (const cid of connectedIds) {
        // Don't broadcast to users we've only sent a pending friend request to
        if (pendingInitiatedByMe.has(cid)) continue;
        io.to(`user:${cid}`).emit('user:status', {
          userId,
          username,
          status: 'online',
          timestamp: new Date()
        });
      }
    }

    // Send user only the presence of their connected users (excluding pending outgoing recipients)
    const visibleIds = Array.from(connectedIds).filter(id => !pendingInitiatedByMe.has(id));
    const connectedPresences = visibleIds.length > 0
      ? await getMultiplePresences(visibleIds)
      : [];
    socket.emit('presence:update', {
      status: 'online',
      onlineUsers: connectedPresences
        .filter((p): p is PresenceData => p !== null && !p.hideOnlineStatus)
        .map(p => ({ userId: p.userId, status: p.status }))
    });

    // Signal to clients (especially the widget) that the server-side setup is
    // complete and all event handlers are registered — safe to send first message.
    socket.emit('socket:ready', { userId });

    // ==================== DIRECT MESSAGES ====================

    socket.on('message:send', async (data: {
      recipientId: string;
      content: string;
      type?: string;
      fileUrl?: string;
      fileName?: string;
      fileSize?: number;
      fileType?: string;
      waveform?: number[];
      duration?: number;
      messageId?: string;
      tempId?: string;
      replyTo?: {
        id: string;
        content: string;
        senderDisplayName?: string | null;
        senderUsername?: string;
      };
    }) => {
      try {
        console.log(`💬 Message from ${username} to user ${data.recipientId}`, {
          type: data.type,
          hasFile: !!data.fileUrl,
          preExistingId: data.messageId,
        });

        if (!data.content || data.content.trim().length === 0) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }
        if (!data.recipientId) {
          socket.emit('error', { message: 'Recipient ID is required' });
          return;
        }

        // Block check — reject if either user has blocked the other
        const blockInfo = await getBlockBetween(userId, data.recipientId);
        if (blockInfo.blocked) {
          const iBlockedThem = blockInfo.blockerId === userId;
          socket.emit('message:blocked', {
            recipientId: data.recipientId,
            tempId: data.tempId,
            reason: iBlockedThem
              ? 'You have blocked this user'
              : "Could not deliver — you're blocked",
          });
          return;
        }

        // Get or create conversation (auto-accepted for friends, pending for non-friends)
        const convo = await getOrCreateConversation(userId, data.recipientId);

        // AI bot conversations are always immediately accepted
        const AI_BOT_CHECK = process.env.AI_BOT_USER_ID;
        if (AI_BOT_CHECK && data.recipientId === AI_BOT_CHECK && convo.status !== 'accepted') {
          await prisma.conversation.update({ where: { id: convo.id }, data: { status: 'accepted' } });
          convo.status = 'accepted';
        }

        // If the conversation is pending and this sender is the NON-initiator (recipient replying), auto-accept
        let wasAutoAccepted = false;
        if (convo.status === 'pending' && convo.initiatorId !== userId) {
          const accepted = await acceptConversation(convo.id, userId);
          if (accepted) {
            convo.status = 'accepted';
            wasAutoAccepted = true;
            // Notify the original sender that their request was accepted
            io.to(`user:${convo.initiatorId}`).emit('conversation:accepted', {
              conversationId: convo.id,
              acceptedBy: userId,
            });
            console.log(`✅ Conversation ${convo.id} auto-accepted (reply from ${username})`);
          }
        }

        const isPending = convo.status === 'pending';

        let message: any;

        if (data.messageId) {
          message = await prisma.message.findUnique({
            where: { id: data.messageId },
            include: { sender: { select: { id: true, username: true, email: true } } }
          });
          if (!message) {
            socket.emit('error', { message: 'Message not found' });
            return;
          }
          // Patch audioDuration/audioWaveform if the upload endpoint didn't save them
          if (data.duration && !message.audioDuration) {
            await prisma.message.update({
              where: { id: data.messageId },
              data: {
                audioDuration: data.duration,
                audioWaveform: message.audioWaveform ?? (data.waveform ? data.waveform : undefined),
              },
            });
            message.audioDuration = data.duration;
          }
        } else {
          message = await prisma.message.create({
            data: {
              senderId: userId,
              recipientId: data.recipientId,
              content: data.content,
              type: data.type || 'text',
              status: 'sent',
              fileUrl: data.fileUrl,
              fileName: data.fileName,
              fileSize: data.fileSize,
              fileType: data.fileType,
              audioWaveform: data.waveform ? data.waveform : undefined,
              audioDuration: data.duration,
              replyToId: data.replyTo?.id ?? null,
              replyToContent: data.replyTo?.content ?? null,
              replyToSenderName: data.replyTo?.senderDisplayName || data.replyTo?.senderUsername?.replace(/^@/, '') || null,
              replyToType: (data.replyTo as any)?.type ?? null,
              replyToDuration: (data.replyTo as any)?.duration ?? null,
            },
            include: { sender: { select: { id: true, username: true, email: true } } }
          });
        }

        // Invalidate conversation cache for both parties
        await Promise.all([
          invalidateConversationCache(userId),
          invalidateConversationCache(data.recipientId),
        ]);

        // Check Redis for socket ID (used for delivered status only).
        // Even if Redis is down we still emit to the Socket.IO room — rooms are
        // in-memory and don't require Redis.
        const recipientSocketId = await getSocketId(data.recipientId);

        // Check if recipient is actually in the room (works without Redis)
        const recipientRoom = io.sockets.adapter.rooms.get(`user:${data.recipientId}`);
        const recipientOnline = (recipientRoom && recipientRoom.size > 0) || !!recipientSocketId;

        const fileUrl = message.fileUrl || data.fileUrl;
        const fileName = message.fileName || data.fileName;
        const fileSize = message.fileSize || data.fileSize;
        const fileType = message.fileType || data.fileType;
        const waveform = (message.audioWaveform as number[] | null) || data.waveform;
        const duration = message.audioDuration || data.duration;

        const replyToPayload = message.replyToId ? {
          id: message.replyToId,
          content: message.replyToContent || '',
          senderDisplayName: message.replyToSenderName || null,
          senderUsername: message.replyToSenderName || '',
          type: message.replyToType || 'text',
          duration: message.replyToDuration || null,
        } : undefined;

        // Always emit to the recipient's room — works even when Redis is down
        const senderUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { isGuest: true },
        });

        io.to(`user:${data.recipientId}`).emit('message:received', {
          id: message.id,
          senderId: userId,
          recipientId: data.recipientId,
          senderUsername: username,
          senderDisplayName: displayName,
          senderProfileImage: profileImage,
          senderIsGuest: senderUser?.isGuest ?? false,
          content: message.content,
          type: message.type,
          timestamp: message.createdAt,
          status: recipientOnline && !isPending ? 'delivered' : 'sent',
          fileUrl,
          fileName,
          fileSize,
          fileType,
          waveform,
          duration,
          replyTo: replyToPayload,
          conversationId: convo.id,
          conversationStatus: convo.status,
        });

        // Only update status to delivered if conversation is accepted and recipient is online
        if (recipientOnline && !isPending) {
          await prisma.message.update({
            where: { id: message.id },
            data: { status: 'delivered' }
          });
        }

        // Confirm to sender — suppress delivered status for pending conversations
        socket.emit('message:sent', {
          id: message.id,
          senderId: userId,
          recipientId: data.recipientId,
          content: message.content,
          type: message.type,
          timestamp: message.createdAt,
          status: (recipientOnline && !isPending) ? 'delivered' : 'sent',
          replyTo: replyToPayload,
          fileUrl: message.fileUrl,
          fileName: message.fileName,
          fileSize: message.fileSize,
          fileType: message.fileType,
          waveform: (message.audioWaveform as number[] | null) || null,
          duration: message.audioDuration,
          conversationId: convo.id,
          conversationStatus: convo.status,
        });

        // ── AI Bot reply ──────────────────────────────────────
        const AI_BOT_ID = process.env.AI_BOT_USER_ID;
        if (AI_BOT_ID && data.recipientId === AI_BOT_ID && message.type === 'text') {
          // Fire-and-forget — don't block the response to the sender
          (async () => {
            try {
              // Fetch conversation history for context (last 10 messages)
              const history = await prisma.message.findMany({
                where: {
                  deletedAt: null,
                  OR: [
                    { senderId: userId,   recipientId: AI_BOT_ID },
                    { senderId: AI_BOT_ID, recipientId: userId },
                  ],
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
                select: { senderId: true, content: true, type: true },
              });

              // Reverse so oldest first and map to OpenAI format
              const chatHistory = history.reverse()
                .filter(m => m.type === 'text')
                .map(m => ({
                  role: (m.senderId === AI_BOT_ID ? 'assistant' : 'user') as 'user' | 'assistant',
                  content: m.content,
                }));

              // Emit typing indicator to sender
              io.to(`user:${userId}`).emit('typing:status', {
                userId: AI_BOT_ID,
                isTyping: true,
              });

              // Get the AI reply
              const replyContent = await generateAIReply(chatHistory, message.content);

              // Small delay to feel more natural
              await new Promise(resolve => setTimeout(resolve, 600));

              // Save the bot's reply to the database
              const botMessage = await prisma.message.create({
                data: {
                  senderId: AI_BOT_ID,
                  recipientId: userId,
                  content: replyContent,
                  type: 'text',
                  status: 'delivered',
                },
              });

              // Invalidate caches
              await Promise.all([
                invalidateConversationCache(userId),
                invalidateConversationCache(AI_BOT_ID),
              ]);

              // Stop typing indicator
              io.to(`user:${userId}`).emit('typing:status', {
                userId: AI_BOT_ID,
                isTyping: false,
              });

              // Deliver the bot reply to the sender
              const botUser = await prisma.user.findUnique({
                where: { id: AI_BOT_ID },
                select: { username: true, displayName: true, profileImage: true },
              });

              io.to(`user:${userId}`).emit('message:received', {
                id: botMessage.id,
                senderId: AI_BOT_ID,
                recipientId: userId,
                senderUsername: botUser?.username ?? '@chatr-ai',
                senderDisplayName: botUser?.displayName ?? 'Chatr AI',
                senderProfileImage: botUser?.profileImage ?? null,
                content: replyContent,
                type: 'text',
                timestamp: botMessage.createdAt,
                status: 'delivered',
                conversationId: convo.id,
                conversationStatus: convo.status,
              });

              console.log(`🤖 AI replied to ${username}`);
            } catch (aiError) {
              console.error('❌ AI bot reply error:', aiError);
              // Stop typing on error
              io.to(`user:${userId}`).emit('typing:status', {
                userId: AI_BOT_ID,
                isTyping: false,
              });
              // Send a friendly error message
              const fallbackMsg = await prisma.message.create({
                data: {
                  senderId: AI_BOT_ID,
                  recipientId: userId,
                  content: "Sorry, I'm having trouble thinking right now. Try again in a moment! 🤖",
                  type: 'text',
                  status: 'delivered',
                },
              });
              io.to(`user:${userId}`).emit('message:received', {
                id: fallbackMsg.id,
                senderId: AI_BOT_ID,
                recipientId: userId,
                senderUsername: '@chatr-ai',
                senderDisplayName: 'Chatr AI',
                senderProfileImage: null,
                content: fallbackMsg.content,
                type: 'text',
                timestamp: fallbackMsg.createdAt,
                status: 'delivered',
                conversationId: convo.id,
                conversationStatus: convo.status,
              });
            }
          })();
        }

      } catch (error) {
        console.error('❌ Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ==================== GROUP MESSAGES ====================

    socket.on('group:join', async (groupId: string) => {
      try {
        const membership = await prisma.groupMember.findFirst({
          where: { groupId, userId }
        });

        if (!membership) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }

        socket.join(`group:${groupId}`);
        console.log(`👥 ${username} joined group room: ${groupId}`);

        socket.to(`group:${groupId}`).emit('group:user:joined', {
          groupId,
          userId,
          username,
          timestamp: new Date()
        });

      } catch (error) {
        console.error('❌ Error joining group:', error);
        socket.emit('error', { message: 'Failed to join group' });
      }
    });

    socket.on('group:leave', (groupId: string) => {
      socket.leave(`group:${groupId}`);
      console.log(`👥 ${username} left group room: ${groupId}`);

      socket.to(`group:${groupId}`).emit('group:user:left', {
        groupId,
        userId,
        username,
        timestamp: new Date()
      });
    });

    socket.on('group:message:send', async (data: { groupId: string; content: string; type?: string }) => {
      try {
        console.log(`💬 Group message from ${username} to group ${data.groupId}`);

        if (!data.content || data.content.trim().length === 0) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

        const membership = await prisma.groupMember.findFirst({
          where: { groupId: data.groupId, userId }
        });

        if (!membership) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }

        if (membership.status !== 'accepted') {
          socket.emit('error', { message: 'Accept the group invite before sending messages' });
          return;
        }

        const message = await prisma.groupMessage.create({
          data: {
            groupId: data.groupId,
            senderId: userId,
            content: data.content,
            type: data.type || 'text'
          },
          include: {
            sender: { select: { id: true, username: true, email: true } }
          }
        });

        io.to(`group:${data.groupId}`).emit('group:message:received', {
          id: message.id,
          groupId: data.groupId,
          senderId: userId,
          senderUsername: username,
          content: message.content,
          type: message.type,
          timestamp: message.createdAt
        });

        console.log(`✅ Group message sent to group ${data.groupId}`);

      } catch (error) {
        console.error('❌ Error sending group message:', error);
        socket.emit('error', { message: 'Failed to send group message' });
      }
    });

    // ==================== MESSAGE STATUS ====================

    socket.on('message:received', async (messageId: string) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { senderId: true, recipientId: true }
        });
        if (!message) return;

        // Check conversation status — suppress status events for pending requests
        const convo = await findConversation(message.senderId, message.recipientId);
        const isPending = convo?.status === 'pending';

        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'delivered' }
        });

        if (!isPending) {
          io.to(`user:${message.senderId}`).emit('message:status', {
            messageId,
            status: 'delivered',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('❌ Error updating message status:', error);
      }
    });

    socket.on('message:read', async (messageId: string) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { senderId: true, recipientId: true }
        });
        if (!message) return;

        // Check conversation status — suppress status events for pending requests
        const convo = await findConversation(message.senderId, message.recipientId);
        const isPending = convo?.status === 'pending';

        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'read', readAt: new Date() }
        });

        if (!isPending) {
          io.to(`user:${message.senderId}`).emit('message:status', {
            messageId,
            status: 'read',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('❌ Error updating message read status:', error);
      }
    });

    // ==================== REACTIONS & UNSEND ====================

    socket.on('message:react', async (data: { messageId: string; emoji: string }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          select: { senderId: true, recipientId: true }
        });
        if (!message) return;

        const existing = await (prisma as any).messageReaction.findUnique({
          where: { messageId_userId: { messageId: data.messageId, userId } }
        });

        if (existing && existing.emoji === data.emoji) {
          await (prisma as any).messageReaction.delete({
            where: { messageId_userId: { messageId: data.messageId, userId } }
          });
        } else {
          await (prisma as any).messageReaction.upsert({
            where: { messageId_userId: { messageId: data.messageId, userId } },
            update: { emoji: data.emoji },
            create: { messageId: data.messageId, userId, emoji: data.emoji }
          });
        }

        const reactions = await (prisma as any).messageReaction.findMany({
          where: { messageId: data.messageId },
          include: { user: { select: { id: true, username: true } } }
        });

        const payload = {
          messageId: data.messageId,
          reactions: reactions.map((r: any) => ({ userId: r.userId, username: r.user.username, emoji: r.emoji }))
        };

        io.to(`user:${message.senderId}`).emit('message:reaction', payload);
        io.to(`user:${message.recipientId}`).emit('message:reaction', payload);

        console.log(`💬 Reaction on message ${data.messageId} by ${username}: ${reactions.length} total`);
      } catch (error) {
        console.error('❌ Error updating reaction:', error);
      }
    });

    socket.on('message:unsend', async (messageId: string) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { senderId: true, recipientId: true, deletedAt: true }
        });
        if (!message) return;
        if (message.senderId !== userId) return;
        if (message.deletedAt) return;

        await prisma.message.update({
          where: { id: messageId },
          data: { deletedAt: new Date() }
        });

        const payload = { messageId, senderDisplayName: displayName || username };
        io.to(`user:${message.senderId}`).emit('message:unsent', payload);
        io.to(`user:${message.recipientId}`).emit('message:unsent', payload);

        // Invalidate conversation cache
        await Promise.all([
          invalidateConversationCache(message.senderId),
          invalidateConversationCache(message.recipientId),
        ]);

        console.log(`🗑️  Message ${messageId} unsent by ${username}`);
      } catch (error) {
        console.error('❌ Error unsending message:', error);
      }
    });

    // ── Edit message ─────────────────────────────────────────────────────────
    socket.on('message:edit', async (data: { messageId: string; content: string }) => {
      try {
        const { messageId, content } = data;
        if (!messageId || !content?.trim()) return;

        const existing = await prisma.message.findUnique({
          where: { id: messageId },
          select: { senderId: true, recipientId: true, content: true, deletedAt: true, type: true }
        });

        if (!existing) { socket.emit('error', { message: 'Message not found' }); return; }
        if (existing.senderId !== userId) { socket.emit('error', { message: 'Not authorised to edit this message' }); return; }
        if (existing.deletedAt) { socket.emit('error', { message: 'Cannot edit an unsent message' }); return; }
        if (existing.type !== 'text') { socket.emit('error', { message: 'Only text messages can be edited' }); return; }

        const trimmed = content.trim();
        const now = new Date();

        await (prisma as any).messageEditHistory.create({
          data: {
            messageId,
            editedById: userId,
            previousContent: existing.content,
            editedAt: now,
          }
        });

        await prisma.message.update({
          where: { id: messageId },
          data: { content: trimmed, edited: true, editedAt: now }
        });

        const payload = {
          messageId,
          content: trimmed,
          editedAt: now.toISOString(),
        };
        io.to(`user:${existing.senderId}`).emit('message:edited', payload);
        io.to(`user:${existing.recipientId}`).emit('message:edited', payload);

        // Invalidate conversation cache (last message preview may have changed)
        await Promise.all([
          invalidateConversationCache(existing.senderId),
          invalidateConversationCache(existing.recipientId),
        ]);

        console.log(`✏️  Message ${messageId} edited by ${username}`);
      } catch (error) {
        console.error('❌ Error editing message:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // ==================== TYPING INDICATORS ====================

    socket.on('typing:start', (data: { recipientId?: string; groupId?: string }) => {
      if (data.recipientId) {
        findConversation(userId, data.recipientId)
          .then(convo => {
            // Suppress guest→agent typing in pending state (guest hasn't been accepted yet)
            // but always allow agent→guest typing so the widget shows the indicator
            if (convo?.status === 'pending' && convo.initiatorId === userId) return;
            io.to(`user:${data.recipientId!}`).emit('typing:status', {
              userId,
              username,
              isTyping: true,
              type: 'direct',
            });
          })
          .catch(() => {
            io.to(`user:${data.recipientId!}`).emit('typing:status', {
              userId,
              username,
              isTyping: true,
              type: 'direct',
            });
          });
      } else if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit('typing:status', {
          userId,
          username,
          groupId: data.groupId,
          isTyping: true,
          type: 'group',
        });
      }
    });

    socket.on('typing:stop', (data: { recipientId?: string; groupId?: string }) => {
      if (data.recipientId) {
        findConversation(userId, data.recipientId)
          .then(convo => {
            if (convo?.status === 'pending' && convo.initiatorId === userId) return;
            io.to(`user:${data.recipientId!}`).emit('typing:status', {
              userId,
              username,
              isTyping: false,
              type: 'direct',
            });
          })
          .catch(() => {
            io.to(`user:${data.recipientId!}`).emit('typing:status', {
              userId,
              username,
              isTyping: false,
              type: 'direct',
            });
          });
      } else if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit('typing:status', {
          userId,
          username,
          groupId: data.groupId,
          isTyping: false,
          type: 'group',
        });
      }
    });

    // ==================== AUDIO STATUS ====================

    socket.on('audio:recording', async (data: { recipientId: string; isRecording: boolean }) => {
      if (data.recipientId) {
        const convo = await findConversation(userId, data.recipientId);
        if (convo?.status === 'pending') return;
        io.to(`user:${data.recipientId}`).emit('audio:recording', {
          userId,
          username,
          isRecording: data.isRecording,
        });
        console.log(`🎙️ ${username} is ${data.isRecording ? 'recording' : 'stopped recording'} voice note`);
      }
    });

    socket.on('audio:listening', async (data: { senderId: string; messageId: string; isListening: boolean; isEnded?: boolean }) => {
      if (data.senderId) {
        io.to(`user:${data.senderId}`).emit('audio:listening', {
          userId,
          username,
          messageId: data.messageId,
          isListening: data.isListening,
          isEnded: data.isEnded,
        });
        console.log(`🎧 ${username} ${data.isListening ? 'started' : data.isEnded ? 'finished (ended)' : 'paused'} listening to message ${data.messageId}`);

        if (data.isEnded === true && data.messageId) {
          try {
            await prisma.message.update({
              where: { id: data.messageId },
              data: { status: 'read', readAt: new Date() },
            });
            // Suppress status for pending conversations
            const convo = await findConversation(userId, data.senderId);
            if (convo?.status !== 'pending') {
              io.to(`user:${data.senderId}`).emit('message:status', {
                messageId: data.messageId,
                status: 'read',
                timestamp: new Date(),
              });
            }
            console.log(`✅ Message ${data.messageId} marked as read (100% listened)`);
          } catch (err) {
            console.error('❌ Failed to mark audio message as read:', err);
          }
        }
      }
    });

    // ==================== GHOST TYPING ====================

    socket.on('ghost:typing', async (data: { recipientId?: string; text: string }) => {
      if (data.recipientId) {
        const convo = await findConversation(userId, data.recipientId);
        if (convo?.status === 'pending') return;
        io.to(`user:${data.recipientId}`).emit('ghost:typing', {
          userId,
          username,
          text: data.text,
          type: 'direct'
        });
      }
    });

    // ==================== USER PRESENCE ====================

    socket.on('presence:update', async (status: 'online' | 'away') => {
      const presence = await getPresence(userId);
      if (presence) {
        await setPresence({
          ...presence,
          status,
          lastSeen: new Date().toISOString(),
        });

        if (!presence.hideOnlineStatus) {
          const { all: connected, pendingInitiatedByMe: pendingByMe } = await getConnectedUserIds(userId);
          for (const cid of connected) {
            if (pendingByMe.has(cid)) continue; // don't reveal status to pending request recipients
            io.to(`user:${cid}`).emit('user:status', {
              userId,
              username,
              status,
              timestamp: new Date()
            });
          }
        }
      }
    });

    socket.on('presence:request', async (userIds: string[]) => {
      const { all: connected, pendingInitiatedByMe } = await getConnectedUserIds(userId);

      const presences = await getMultiplePresences(userIds);

      // For visible users not in Redis (offline / never connected), fall back to DB lastSeen
      const visibleIds = userIds.filter(id => connected.has(id) && !pendingInitiatedByMe.has(id));
      const missingIds = visibleIds.filter((id) => {
        const idx = userIds.indexOf(id);
        return !presences[idx];
      });
      let dbLastSeen: Record<string, Date | null> = {};
      if (missingIds.length > 0) {
        try {
          const rows = await prisma.user.findMany({
            where: { id: { in: missingIds } },
            select: { id: true, lastSeen: true },
          });
          rows.forEach(r => { dbLastSeen[r.id] = r.lastSeen; });
        } catch (e) {
          console.error('❌ Error fetching lastSeen from DB:', e);
        }
      }

      const presenceData = userIds.map((id, i) => {
        // Not connected at all, or pending outgoing (sender can't see recipient)
        if (!connected.has(id) || pendingInitiatedByMe.has(id)) {
          return { userId: id, status: 'offline', lastSeen: null, hidden: true };
        }
        const p = presences[i];
        const hidden = p?.hideOnlineStatus ?? false;
        return {
          userId: id,
          status: hidden ? 'offline' : (p?.status || 'offline'),
          lastSeen: p?.lastSeen || dbLastSeen[id]?.toISOString() || null,
          hidden,
        };
      });

      socket.emit('presence:response', presenceData);
    });

    // Keep socket-level profileImage in sync when user uploads a new one
    socket.on('profile:imageUpdated', (data: { profileImage: string }) => {
      profileImage = data.profileImage;
      socket.profileImage = data.profileImage;
    });

    // ==================== FRIENDS ====================

    // Relay friend lifecycle events to the other user in real-time.
    // The FE emits this after every REST action (request, accept, decline, remove, block, unblock).
    socket.on('friend:notify', async (data: {
      type: 'request' | 'accepted' | 'declined' | 'removed' | 'blocked' | 'unblocked' | 'cancelled';
      addresseeId: string;
      friendshipId?: string;
    }) => {
      try {
        // Look up sender's display info fresh from DB
        const sender = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, username: true, displayName: true, profileImage: true },
        });
        if (!sender) return;

        // Emit to the other user's personal room
        io.to(`user:${data.addresseeId}`).emit('friend:update', {
          type: data.type,
          friendshipId: data.friendshipId,
          from: {
            id: sender.id,
            username: sender.username,
            displayName: sender.displayName,
            profileImage: sender.profileImage,
          },
        });

        // Also notify the sender themselves so any other open tabs/devices refresh
        io.to(`user:${userId}`).emit('friend:update', {
          type: data.type,
          friendshipId: data.friendshipId,
          from: {
            id: sender.id,
            username: sender.username,
            displayName: sender.displayName,
            profileImage: sender.profileImage,
          },
        });
      } catch (err) {
        console.error('❌ friend:notify error:', err);
      }
    });

    // Update user settings that affect socket behaviour
    socket.on('settings:update', async (data: { showOnlineStatus?: boolean; showPhoneNumber?: boolean; showEmail?: boolean }) => {
      // ── Online status ──────────────────────────────────────────────────────
      if (typeof data.showOnlineStatus === 'boolean') {
        const hide = !data.showOnlineStatus;
        const presence = await getPresence(userId);
        if (presence) {
          await setPresence({ ...presence, hideOnlineStatus: hide });
        }

        try {
          await prisma.user.update({
            where: { id: userId },
            data: { showOnlineStatus: data.showOnlineStatus },
          });
        } catch (e) {
          console.error('❌ Error updating showOnlineStatus:', e);
        }

        const effectiveStatus = hide ? 'offline' : (presence?.status || 'online');
        const { all: settingsConnected, pendingInitiatedByMe: settingsPending } = await getConnectedUserIds(userId);
        for (const cid of settingsConnected) {
          if (settingsPending.has(cid)) continue;
          io.to(`user:${cid}`).emit('user:status', {
            userId,
            username,
            status: effectiveStatus,
            hidden: hide,
            lastSeen: hide ? new Date() : null,
            timestamp: new Date(),
          });
        }
      }

      // ── Phone / Email visibility ───────────────────────────────────────────
      const privacyUpdate: Record<string, boolean> = {};
      if (typeof data.showPhoneNumber === 'boolean') privacyUpdate.showPhoneNumber = data.showPhoneNumber;
      if (typeof data.showEmail === 'boolean') privacyUpdate.showEmail = data.showEmail;
      if (Object.keys(privacyUpdate).length > 0) {
        try {
          await prisma.user.update({ where: { id: userId }, data: privacyUpdate });
        } catch (e) {
          console.error('❌ Error updating privacy settings:', e);
        }
      }
    });

    // ==================== DISCONNECT ====================

    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${username} (${socket.id})`);

      const presence = await getPresence(userId);

      // Update presence to offline in Redis, then remove
      if (presence) {
        await setPresence({
          ...presence,
          status: 'offline',
          lastSeen: new Date().toISOString(),
        });
      }
      await removeSocketMapping(userId);
      await removePresence(userId);

      // Broadcast offline only to connected users (excluding pending request recipients)
      if (!presence?.hideOnlineStatus) {
        const { all: disconnConnected, pendingInitiatedByMe: disconnPending } = await getConnectedUserIds(userId);
        for (const cid of disconnConnected) {
          if (disconnPending.has(cid)) continue; // don't reveal offline status to pending request recipients
          io.to(`user:${cid}`).emit('user:status', {
            userId,
            username,
            status: 'offline',
            lastSeen: new Date()
          });
        }
      }

      // Persist lastSeen to database
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { lastSeen: new Date() }
        });
      } catch (error) {
        console.error('❌ Error updating last seen:', error);
      }
    });

    // ==================== GROUPS ====================

    socket.on('group:message', async (data: {
      groupId: string; content: string; type?: string; tempId?: string;
      fileUrl?: string; fileName?: string; fileSize?: number; fileType?: string;
      waveform?: number[]; duration?: number; messageId?: string;
    }) => {
      try {
        const { groupId, content, type = 'text', tempId, fileUrl, fileName, fileSize, fileType, waveform, duration, messageId: existingId } = data;
        if (!groupId || !content?.trim()) return;

        // Verify sender is a member
        const member = await prisma.groupMember.findFirst({
          where: { userId, groupId },
        });
        if (!member) {
          console.error(`❌ group:message membership check failed — userId: "${userId}", groupId: "${groupId}"`);
          socket.emit('error', 'Not a member of this group');
          return;
        }

        // If the message was already created by the upload endpoint, just fetch it
        let message: any;
        if (existingId) {
          message = await prisma.groupMessage.findUnique({
            where: { id: existingId },
            include: { sender: { select: { id: true, username: true, displayName: true, profileImage: true } } },
          });
          // Patch audioDuration if the upload endpoint didn't save it
          if (message && duration && !message.audioDuration) {
            await prisma.groupMessage.update({
              where: { id: existingId },
              data: {
                audioDuration: duration,
                audioWaveform: message.audioWaveform ?? (waveform ? waveform : undefined),
              },
            });
            message.audioDuration = duration;
          }
        }

        if (!message) {
          message = await prisma.groupMessage.create({
            data: {
              groupId, senderId: userId,
              content: content.trim(), type,
              fileUrl, fileName, fileSize, fileType,
              audioWaveform: waveform,
              audioDuration: duration,
            },
            include: { sender: { select: { id: true, username: true, displayName: true, profileImage: true } } },
          });
        }

        // Broadcast to all group members
        const members = await prisma.groupMember.findMany({ where: { groupId } });
        const payload = {
          ...message,
          tempId,
          waveform: (message.audioWaveform as number[] | null) || waveform,
          duration: message.audioDuration || duration,
        };
        for (const m of members) {
          io.to(`user:${m.userId}`).emit('group:message', payload);
        }
      } catch (err) {
        console.error('❌ group:message error', err);
        socket.emit('error', 'Failed to send group message');
      }
    });

    socket.on('group:typing', async (data: { groupId: string; isTyping: boolean }) => {
      try {
        const { groupId, isTyping } = data;
        const members = await prisma.groupMember.findMany({ where: { groupId } });
        const senderUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, displayName: true, username: true },
        });
        for (const m of members) {
          if (m.userId === userId) continue;
          io.to(`user:${m.userId}`).emit('group:typing', { groupId, userId, displayName: senderUser?.displayName || senderUser?.username, isTyping });
        }
      } catch (err) {
        console.error('❌ group:typing error', err);
      }
    });

  });
}


