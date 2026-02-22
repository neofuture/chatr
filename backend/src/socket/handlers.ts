import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  displayName?: string | null;
  profileImage?: string | null;
}

interface UserPresence {
  userId: string;
  socketId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
}

// In-memory store for user presence (replace with Redis in production)
const userPresence = new Map<string, UserPresence>();
const userSockets = new Map<string, string>(); // userId -> socketId

export function setupSocketHandlers(io: Server) {
  // Middleware for JWT authentication
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        console.warn('⚠️  WebSocket connection attempt without token');
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      let decoded: { userId: string };
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { userId: string };
      } catch (jwtError) {
        console.error('❌ JWT verification failed:', jwtError instanceof Error ? jwtError.message : 'Unknown error');
        return next(new Error('Authentication error: Invalid token'));
      }

      // Verify user exists in database
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

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    const username = socket.username!;
    const displayName = socket.displayName ?? null;
    const profileImage = socket.profileImage ?? null;

    console.log(`🔌 User connected: ${username} (${socket.id})`);

    // Store user connection
    userSockets.set(userId, socket.id);
    userPresence.set(userId, {
      userId,
      socketId: socket.id,
      status: 'online',
      lastSeen: new Date()
    });

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Notify user's contacts they're online
    socket.broadcast.emit('user:status', {
      userId,
      username,
      status: 'online',
      timestamp: new Date()
    });

    // Send user their current presence info
    socket.emit('presence:update', {
      status: 'online',
      onlineUsers: Array.from(userPresence.values()).map(p => ({
        userId: p.userId,
        status: p.status
      }))
    });

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
      messageId?: string; // Pre-existing message ID (e.g. from file upload)
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

        let message: any;

        if (data.messageId) {
          // Message already exists in DB (created by file upload) - just look it up
          message = await prisma.message.findUnique({
            where: { id: data.messageId },
            include: { sender: { select: { id: true, username: true, email: true } } }
          });
          if (!message) {
            socket.emit('error', { message: 'Message not found' });
            return;
          }
        } else {
          // Create new message record
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
            },
            include: { sender: { select: { id: true, username: true, email: true } } }
          });
        }

        // Send to recipient if online
        const recipientSocketId = userSockets.get(data.recipientId);
        // Use DB record fields for file/audio data (reliable for pre-existing messages)
        const fileUrl = message.fileUrl || data.fileUrl;
        const fileName = message.fileName || data.fileName;
        const fileSize = message.fileSize || data.fileSize;
        const fileType = message.fileType || data.fileType;
        const waveform = (message.audioWaveform as number[] | null) || data.waveform;
        const duration = message.audioDuration || data.duration;

        if (recipientSocketId) {
          io.to(`user:${data.recipientId}`).emit('message:received', {
            id: message.id,
            senderId: userId,
            senderUsername: username,
            senderDisplayName: displayName,
            senderProfileImage: profileImage,
            content: message.content,
            type: message.type,
            timestamp: message.createdAt,
            status: 'delivered',
            fileUrl,
            fileName,
            fileSize,
            fileType,
            waveform,
            duration,
          });

          // Update message status to delivered
          await prisma.message.update({
            where: { id: message.id },
            data: { status: 'delivered' }
          });
        }

        // Confirm to sender
        socket.emit('message:sent', {
          id: message.id,
          recipientId: data.recipientId,
          content: message.content,
          timestamp: message.createdAt,
          status: recipientSocketId ? 'delivered' : 'sent'
        });

      } catch (error) {
        console.error('❌ Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ==================== GROUP MESSAGES ====================

    socket.on('group:join', async (groupId: string) => {
      try {
        // Verify user is member of group
        const membership = await prisma.groupMember.findFirst({
          where: {
            groupId,
            userId
          }
        });

        if (!membership) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }

        socket.join(`group:${groupId}`);
        console.log(`👥 ${username} joined group room: ${groupId}`);

        // Notify group members
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

        // Validate message
        if (!data.content || data.content.trim().length === 0) {
          socket.emit('error', { message: 'Message content is required' });
          return;
        }

        // Verify user is member of group
        const membership = await prisma.groupMember.findFirst({
          where: {
            groupId: data.groupId,
            userId
          }
        });

        if (!membership) {
          socket.emit('error', { message: 'Not a member of this group' });
          return;
        }

        // Save message to database
        const message = await prisma.groupMessage.create({
          data: {
            groupId: data.groupId,
            senderId: userId,
            content: data.content,
            type: data.type || 'text'
          },
          include: {
            sender: {
              select: { id: true, username: true, email: true }
            }
          }
        });

        // Broadcast to all group members
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
        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'delivered' }
        });

        // Notify sender
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { senderId: true }
        });

        if (message) {
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
        await prisma.message.update({
          where: { id: messageId },
          data: {
            status: 'read',
            readAt: new Date()
          }
        });

        // Notify sender
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { senderId: true }
        });

        if (message) {
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

    // ==================== REACTIONS & UNSEND ====================

    socket.on('message:react', async (data: { messageId: string; emoji: string }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
          select: { senderId: true, recipientId: true }
        });
        if (!message) return;

        // Check if this user already reacted with this exact emoji — if so, remove it (toggle off)
        const existing = await (prisma as any).messageReaction.findUnique({
          where: { messageId_userId: { messageId: data.messageId, userId } }
        });

        if (existing && existing.emoji === data.emoji) {
          // Same emoji — remove reaction
          await (prisma as any).messageReaction.delete({
            where: { messageId_userId: { messageId: data.messageId, userId } }
          });
        } else {
          // New reaction or different emoji — upsert
          await (prisma as any).messageReaction.upsert({
            where: { messageId_userId: { messageId: data.messageId, userId } },
            update: { emoji: data.emoji },
            create: { messageId: data.messageId, userId, emoji: data.emoji }
          });
        }

        // Fetch full updated reactions list
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
        // Only the sender can unsend
        if (message.senderId !== userId) return;
        if (message.deletedAt) return; // already unsent

        await prisma.message.update({
          where: { id: messageId },
          data: { deletedAt: new Date(), content: '', reaction: null }
        });

        // Notify both parties to remove the message
        const payload = { messageId };
        io.to(`user:${message.senderId}`).emit('message:unsent', payload);
        io.to(`user:${message.recipientId}`).emit('message:unsent', payload);

        console.log(`🗑️  Message ${messageId} unsent by ${username}`);
      } catch (error) {
        console.error('❌ Error unsending message:', error);
      }
    });

    // ==================== TYPING INDICATORS ====================

    socket.on('typing:start', (data: { recipientId?: string; groupId?: string }) => {
      if (data.recipientId) {
        // Direct message typing
        io.to(`user:${data.recipientId}`).emit('typing:status', {
          userId,
          username,
          isTyping: true,
          type: 'direct'
        });
      } else if (data.groupId) {
        // Group typing
        socket.to(`group:${data.groupId}`).emit('typing:status', {
          userId,
          username,
          groupId: data.groupId,
          isTyping: true,
          type: 'group'
        });
      }
    });

    socket.on('typing:stop', (data: { recipientId?: string; groupId?: string }) => {
      if (data.recipientId) {
        io.to(`user:${data.recipientId}`).emit('typing:status', {
          userId,
          username,
          isTyping: false,
          type: 'direct'
        });
      } else if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit('typing:status', {
          userId,
          username,
          groupId: data.groupId,
          isTyping: false,
          type: 'group'
        });
      }
    });

    // ==================== AUDIO STATUS ====================

    // Sender is recording a voice note - notify recipient
    socket.on('audio:recording', (data: { recipientId: string; isRecording: boolean }) => {
      if (data.recipientId) {
        io.to(`user:${data.recipientId}`).emit('audio:recording', {
          userId,
          username,
          isRecording: data.isRecording,
        });
        console.log(`🎙️ ${username} is ${data.isRecording ? 'recording' : 'stopped recording'} voice note`);
      }
    });

    // Recipient is listening to an audio message - notify sender
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

        // Only mark as read when they FINISH (audio ended = 100% listened)
        if (data.isEnded === true && data.messageId) {
          try {
            await prisma.message.update({
              where: { id: data.messageId },
              data: { status: 'read', readAt: new Date() },
            });
            io.to(`user:${data.senderId}`).emit('message:status', {
              messageId: data.messageId,
              status: 'read',
              timestamp: new Date(),
            });
            console.log(`✅ Message ${data.messageId} marked as read (100% listened)`);
          } catch (err) {
            console.error('❌ Failed to mark audio message as read:', err);
          }
        }
      }
    });

    // ==================== GHOST TYPING ====================

    socket.on('ghost:typing', (data: { recipientId?: string; text: string }) => {
      if (data.recipientId) {
        // Send real-time typing text to recipient
        io.to(`user:${data.recipientId}`).emit('ghost:typing', {
          userId,
          username,
          text: data.text,
          type: 'direct'
        });
        console.log(`👻 Ghost typing from ${username} to recipient ${data.recipientId}: "${data.text.substring(0, 20)}${data.text.length > 20 ? '...' : ''}"`);
      }
    });

    // ==================== USER PRESENCE ====================

    socket.on('presence:update', (status: 'online' | 'away') => {
      const presence = userPresence.get(userId);
      if (presence) {
        presence.status = status;
        presence.lastSeen = new Date();
        userPresence.set(userId, presence);

        // Broadcast status to contacts
        socket.broadcast.emit('user:status', {
          userId,
          username,
          status,
          timestamp: new Date()
        });
      }
    });

    socket.on('presence:request', (userIds: string[]) => {
      const presenceData = userIds.map(id => {
        const presence = userPresence.get(id);
        return {
          userId: id,
          status: presence?.status || 'offline',
          lastSeen: presence?.lastSeen || null
        };
      });

      socket.emit('presence:response', presenceData);
    });

    // ==================== DISCONNECT ====================

    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${username} (${socket.id})`);

      // Update presence
      const presence = userPresence.get(userId);
      if (presence) {
        presence.status = 'offline';
        presence.lastSeen = new Date();
        userPresence.set(userId, presence);
      }

      // Remove from active sockets
      userSockets.delete(userId);

      // Notify contacts
      socket.broadcast.emit('user:status', {
        userId,
        username,
        status: 'offline',
        lastSeen: new Date()
      });

      // Update user's last seen in database
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { lastSeen: new Date() }
        });
      } catch (error) {
        console.error('❌ Error updating last seen:', error);
      }
    });
  });
}

