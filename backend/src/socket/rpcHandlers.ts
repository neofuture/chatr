import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';
import { getConversations } from '../lib/getConversations';
import { invalidateConversationCache, getSocketId } from '../lib/redis';
import { getConnectedUserIds, acceptConversation, declineConversation, nukeConversation, nukeByParticipants } from '../lib/conversation';
import { maybeRegenerateGroupSummary } from '../services/summaryEngine';
import { deleteGuestUser } from '../routes/widget';

type Ack = (res: any) => void;

const userSelect = {
  id: true, username: true, displayName: true,
  firstName: true, lastName: true,
  profileImage: true, email: true, privacyOnlineStatus: true,
};

async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } });
  return m?.role === 'owner' || m?.role === 'admin';
}

async function isGroupOwner(userId: string, groupId: string): Promise<boolean> {
  const m = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } });
  return m?.role === 'owner';
}

async function sendSystemMessage(io: Server, groupId: string, content: string) {
  try {
    const owner = await prisma.groupMember.findFirst({ where: { groupId, role: 'owner' } });
    const senderId = owner?.userId ?? (await prisma.group.findUnique({ where: { id: groupId }, select: { ownerId: true } }))!.ownerId;
    const msg = await prisma.groupMessage.create({ data: { groupId, senderId, content, type: 'system' } });
    const members = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
    for (const m of members) {
      io.to(`user:${m.userId}`).emit('group:message', {
        id: msg.id, groupId, senderId: msg.senderId, content, type: 'system',
        createdAt: msg.createdAt, sender: null,
      });
    }
  } catch (e) { console.warn('sendSystemMessage failed:', e); }
}

async function promoteNextOwner(groupId: string, excludeUserId: string): Promise<string | null> {
  const remainingOwner = await prisma.groupMember.findFirst({
    where: { groupId, userId: { not: excludeUserId }, role: 'owner' },
  });
  if (remainingOwner) return remainingOwner.userId;
  const next = await prisma.groupMember.findFirst({
    where: { groupId, userId: { not: excludeUserId } },
    orderBy: [{ role: 'desc' }, { joinedAt: 'asc' }],
  });
  if (!next) return null;
  await prisma.$transaction([
    prisma.group.update({ where: { id: groupId }, data: { ownerId: next.userId } }),
    prisma.groupMember.update({ where: { id: next.id }, data: { role: 'owner' } }),
  ]);
  return next.userId;
}

export function registerRPCHandlers(socket: Socket, io: Server, userId: string) {

  // ══════════════════════════════════════════════════════════════════════
  // USERS
  // ══════════════════════════════════════════════════════════════════════

  socket.on('users:me', async (_data: any, ack?: Ack) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, email: true, phoneNumber: true, username: true,
          displayName: true, firstName: true, lastName: true,
          profileImage: true, coverImage: true, emailVerified: true,
          phoneVerified: true, createdAt: true, gender: true,
          privacyOnlineStatus: true, privacyPhone: true, privacyEmail: true,
          privacyFullName: true, privacyGender: true, privacyJoinedDate: true,
        },
      });
      ack?.(user || { error: 'User not found' });
    } catch (e) { console.error('users:me error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('users:me:update', async (data: any, ack?: Ack) => {
    try {
      const { displayName, firstName, lastName, gender } = data;
      const validGenders = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
      if (gender !== undefined && gender !== null && gender !== '' && !validGenders.includes(gender)) {
        ack?.({ error: 'Invalid gender value' }); return;
      }
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(displayName !== undefined ? { displayName: displayName || null } : {}),
          ...(firstName !== undefined ? { firstName: firstName || null } : {}),
          ...(lastName !== undefined ? { lastName: lastName || null } : {}),
          ...(gender !== undefined ? { gender: gender || null } : {}),
        },
        select: {
          id: true, username: true, displayName: true, firstName: true,
          lastName: true, profileImage: true, coverImage: true, gender: true,
          email: true, phoneNumber: true,
        },
      });
      // Broadcast to connected users
      try {
        const { all: connectedIds } = await getConnectedUserIds(userId);
        const cachePromises = Array.from(connectedIds).map(id => invalidateConversationCache(id));
        cachePromises.push(invalidateConversationCache(userId));
        await Promise.all(cachePromises);
        const payload = { userId, displayName: updated.displayName, firstName: updated.firstName, lastName: updated.lastName, profileImage: updated.profileImage };
        for (const cid of connectedIds) io.to(`user:${cid}`).emit('user:profileUpdate', payload);
      } catch {}
      ack?.(updated);
    } catch (e) { console.error('users:me:update error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('users:me:settings', async (data: any, ack?: Ack) => {
    try {
      const VALID = ['everyone', 'friends', 'nobody'];
      const allowed = ['privacyOnlineStatus', 'privacyPhone', 'privacyEmail', 'privacyFullName', 'privacyGender', 'privacyJoinedDate'] as const;
      type K = typeof allowed[number];
      const upd: Partial<Record<K, string>> = {};
      for (const key of allowed) {
        if (typeof data[key] === 'string' && VALID.includes(data[key])) upd[key] = data[key];
      }
      if (Object.keys(upd).length === 0) { ack?.({ error: 'No valid settings' }); return; }
      await prisma.user.update({ where: { id: userId }, data: upd });
      ack?.({ ok: true });
    } catch (e) { console.error('users:me:settings error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('users:list', async (_data: any, ack?: Ack) => {
    try {
      const users = await prisma.user.findMany({
        where: { emailVerified: true },
        select: {
          id: true, username: true, email: true, emailVerified: true,
          createdAt: true, displayName: true, firstName: true,
          lastName: true, profileImage: true,
        },
        orderBy: { username: 'asc' },
      });
      ack?.({ users });
    } catch (e) { console.error('users:list error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('users:search', async (data: { q: string }, ack?: Ack) => {
    try {
      const q = (data.q || '').trim();
      if (!q) { ack?.({ users: [] }); return; }
      const users = await prisma.user.findMany({
        where: {
          emailVerified: true, isGuest: false, isBot: false,
          id: { not: userId },
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true, username: true, displayName: true,
          firstName: true, lastName: true, profileImage: true,
          lastSeen: true, isBot: true, isGuest: true,
        },
        take: 30,
      });
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { requesterId: userId, addresseeId: { in: users.map(u => u.id) } },
            { addresseeId: userId, requesterId: { in: users.map(u => u.id) } },
          ],
        },
      });
      const fsMap = new Map(friendships.map(f => {
        const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
        return [otherId, { id: f.id, status: f.status, iRequested: f.requesterId === userId }];
      }));
      const result = users.map(u => ({ ...u, friendship: fsMap.get(u.id) ?? null, isFriend: fsMap.get(u.id)?.status === 'accepted' }));
      result.sort((a, b) => {
        if (a.isFriend !== b.isFriend) return a.isFriend ? -1 : 1;
        return (a.displayName || a.username).localeCompare(b.displayName || b.username);
      });
      ack?.({ users: result });
    } catch (e) { console.error('users:search error:', e); ack?.({ error: 'Internal error' }); }
  });

  // ══════════════════════════════════════════════════════════════════════
  // FRIENDS
  // ══════════════════════════════════════════════════════════════════════

  socket.on('friends:list', async (_data: any, ack?: Ack) => {
    try {
      const rows = await prisma.friendship.findMany({
        where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
        include: { requester: { select: userSelect }, addressee: { select: userSelect } },
        orderBy: { updatedAt: 'desc' },
      });
      const friends = rows.map(r => ({
        friendshipId: r.id, since: r.updatedAt,
        user: r.requesterId === userId ? r.addressee : r.requester,
      }));
      ack?.({ friends });
    } catch (e) { console.error('friends:list error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:requests:incoming', async (_data: any, ack?: Ack) => {
    try {
      const rows = await prisma.friendship.findMany({
        where: { addresseeId: userId, status: 'pending' },
        include: { requester: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
      });
      ack?.({ requests: rows.map(r => ({ friendshipId: r.id, createdAt: r.createdAt, user: r.requester })) });
    } catch (e) { console.error('friends:requests:incoming error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:requests:outgoing', async (_data: any, ack?: Ack) => {
    try {
      const rows = await prisma.friendship.findMany({
        where: { requesterId: userId, status: 'pending' },
        include: { addressee: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
      });
      ack?.({ requests: rows.map(r => ({ friendshipId: r.id, createdAt: r.createdAt, user: r.addressee })) });
    } catch (e) { console.error('friends:requests:outgoing error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:blocked', async (_data: any, ack?: Ack) => {
    try {
      const rows = await prisma.friendship.findMany({
        where: { requesterId: userId, status: 'blocked' },
        include: { addressee: { select: userSelect } },
        orderBy: { createdAt: 'desc' },
      });
      ack?.({ blocked: rows.map(r => ({ friendshipId: r.id, createdAt: r.createdAt, user: r.addressee })) });
    } catch (e) { console.error('friends:blocked error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:search', async (data: { q: string }, ack?: Ack) => {
    try {
      const q = (data.q || '').trim();
      if (q.length < 2) { ack?.({ users: [] }); return; }
      const users = await prisma.user.findMany({
        where: {
          id: { not: userId }, emailVerified: true, isGuest: false, isBot: false,
          OR: [
            { username: { contains: q, mode: 'insensitive' } },
            { displayName: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: userSelect,
        take: 20,
      });
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { requesterId: userId, addresseeId: { in: users.map(u => u.id) } },
            { addresseeId: userId, requesterId: { in: users.map(u => u.id) } },
          ],
        },
      });
      const fsMap = new Map(friendships.map(f => {
        const otherId = f.requesterId === userId ? f.addresseeId : f.requesterId;
        return [otherId, { id: f.id, status: f.status, iRequested: f.requesterId === userId }];
      }));
      ack?.({ users: users.map(u => ({ ...u, friendship: fsMap.get(u.id) ?? null })) });
    } catch (e) { console.error('friends:search error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:request', async (data: { addresseeId: string }, ack?: Ack) => {
    try {
      const { addresseeId } = data;
      if (!addresseeId) { ack?.({ error: 'addresseeId required' }); return; }
      if (addresseeId === userId) { ack?.({ error: 'Cannot add yourself' }); return; }
      const existing = await prisma.friendship.findFirst({
        where: { OR: [{ requesterId: userId, addresseeId }, { requesterId: addresseeId, addresseeId: userId }] },
      });
      if (existing) {
        if (existing.status === 'accepted') { ack?.({ error: 'Already friends' }); return; }
        if (existing.status === 'blocked') { ack?.({ error: 'Cannot send request' }); return; }
        if (existing.status === 'pending') {
          if (existing.addresseeId === userId) {
            const updated = await prisma.friendship.update({
              where: { id: existing.id }, data: { status: 'accepted' },
              include: { requester: { select: userSelect }, addressee: { select: userSelect } },
            });
            ack?.({ friendship: updated, autoAccepted: true }); return;
          }
          ack?.({ error: 'Request already sent' }); return;
        }
      }
      const friendship = await prisma.friendship.create({
        data: { requesterId: userId, addresseeId, status: 'pending' },
        include: { requester: { select: userSelect }, addressee: { select: userSelect } },
      });
      ack?.({ friendship });
    } catch (e) { console.error('friends:request error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:accept', async (data: { friendshipId: string }, ack?: Ack) => {
    try {
      const { friendshipId } = data;
      const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
      if (!row) { ack?.({ error: 'Request not found' }); return; }
      if (row.addresseeId !== userId) { ack?.({ error: 'Not authorised' }); return; }
      if (row.status !== 'pending') { ack?.({ error: 'Request is not pending' }); return; }
      const updated = await prisma.friendship.update({
        where: { id: friendshipId }, data: { status: 'accepted' },
        include: { requester: { select: userSelect }, addressee: { select: userSelect } },
      });
      ack?.({ friendship: updated });
    } catch (e) { console.error('friends:accept error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:decline', async (data: { friendshipId: string }, ack?: Ack) => {
    try {
      const { friendshipId } = data;
      const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
      if (!row) { ack?.({ error: 'Request not found' }); return; }
      if (row.requesterId !== userId && row.addresseeId !== userId) { ack?.({ error: 'Not authorised' }); return; }
      await prisma.friendship.delete({ where: { id: friendshipId } });
      ack?.({ success: true });
    } catch (e) { console.error('friends:decline error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:remove', async (data: { friendshipId: string }, ack?: Ack) => {
    try {
      const { friendshipId } = data;
      const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
      if (!row) { ack?.({ error: 'Friendship not found' }); return; }
      if (row.requesterId !== userId && row.addresseeId !== userId) { ack?.({ error: 'Not authorised' }); return; }
      await prisma.friendship.delete({ where: { id: friendshipId } });
      ack?.({ success: true });
    } catch (e) { console.error('friends:remove error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:block', async (data: { targetUserId: string }, ack?: Ack) => {
    try {
      const { targetUserId } = data;
      if (targetUserId === userId) { ack?.({ error: 'Cannot block yourself' }); return; }
      await prisma.friendship.deleteMany({
        where: { OR: [{ requesterId: userId, addresseeId: targetUserId }, { requesterId: targetUserId, addresseeId: userId }] },
      });
      const friendship = await prisma.friendship.create({
        data: { requesterId: userId, addresseeId: targetUserId, status: 'blocked' },
        include: { addressee: { select: userSelect } },
      });
      await Promise.all([invalidateConversationCache(userId), invalidateConversationCache(targetUserId)]).catch(() => {});
      ack?.({ friendship });
    } catch (e) { console.error('friends:block error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:unblock', async (data: { targetUserId: string }, ack?: Ack) => {
    try {
      const { targetUserId } = data;
      await prisma.friendship.deleteMany({
        where: { requesterId: userId, addresseeId: targetUserId, status: 'blocked' },
      });
      await Promise.all([invalidateConversationCache(userId), invalidateConversationCache(targetUserId)]).catch(() => {});
      ack?.({ success: true });
    } catch (e) { console.error('friends:unblock error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('friends:block-status', async (data: { targetUserId: string }, ack?: Ack) => {
    try {
      const { targetUserId } = data;
      const row = await prisma.friendship.findFirst({
        where: {
          status: 'blocked',
          OR: [{ requesterId: userId, addresseeId: targetUserId }, { requesterId: targetUserId, addresseeId: userId }],
        },
        select: { requesterId: true },
      });
      if (!row) { ack?.({ blocked: false }); return; }
      ack?.({ blocked: true, blockedByMe: row.requesterId === userId });
    } catch (e) { console.error('friends:block-status error:', e); ack?.({ error: 'Internal error' }); }
  });

  // ══════════════════════════════════════════════════════════════════════
  // GROUPS
  // ══════════════════════════════════════════════════════════════════════

  socket.on('groups:list', async (_data: any, ack?: Ack) => {
    try {
      const memberships = await prisma.groupMember.findMany({
        where: { userId, status: 'accepted' },
        include: {
          group: {
            include: {
              members: { include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } },
              messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1, include: { sender: { select: { displayName: true, username: true } } } },
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      });
      const groups = memberships.map(m => {
        maybeRegenerateGroupSummary(m.group.id, m.group.summaryMessageCount, m.group.summaryGeneratedAt);
        return { ...m.group, lastMessage: m.group.messages[0] ?? null, summary: m.group.summary ?? null };
      });
      ack?.({ groups });
    } catch (e) { console.error('groups:list error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:invites', async (_data: any, ack?: Ack) => {
    try {
      const memberships = await prisma.groupMember.findMany({
        where: { userId, status: 'pending' },
        include: { group: { include: { members: { where: { status: 'accepted' }, select: { userId: true } } } } },
      });
      const inviterIds = [...new Set(memberships.map(m => m.invitedBy).filter(Boolean) as string[])];
      const inviters = inviterIds.length
        ? await prisma.user.findMany({ where: { id: { in: inviterIds } }, select: { id: true, displayName: true, username: true } })
        : [];
      const inviterMap = Object.fromEntries(inviters.map(u => [u.id, u]));
      const invites = memberships.map(m => {
        const inviter = m.invitedBy ? inviterMap[m.invitedBy] : null;
        return {
          groupId: m.groupId, groupName: m.group.name, groupDescription: m.group.description,
          memberCount: m.group.members.length,
          invitedBy: inviter?.displayName || inviter?.username?.replace(/^@/, '') || 'Someone',
          invitedById: m.invitedBy,
        };
      });
      ack?.({ invites });
    } catch (e) { console.error('groups:invites error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:detail', async (data: { groupId: string }, ack?: Ack) => {
    try {
      const group = await prisma.group.findUnique({
        where: { id: data.groupId },
        include: {
          members: {
            where: { status: { in: ['accepted', 'pending'] } },
            include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } },
          },
        },
      });
      if (!group) { ack?.({ error: 'Group not found' }); return; }
      const callerMember = group.members.find(m => m.userId === userId);
      if (!callerMember) { ack?.({ error: 'Not a member' }); return; }
      ack?.({ group, memberStatus: callerMember.status });
    } catch (e) { console.error('groups:detail error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:create', async (data: { name: string; description?: string; memberIds?: string[] }, ack?: Ack) => {
    try {
      if (!data.name?.trim()) { ack?.({ error: 'Group name is required' }); return; }
      const memberIds = data.memberIds || [];
      const group = await prisma.group.create({
        data: {
          name: data.name.trim(),
          description: data.description?.trim() || null,
          ownerId: userId,
          members: {
            create: [
              { userId, role: 'owner', status: 'accepted' },
              ...memberIds.filter(id => id !== userId).map(id => ({ userId: id, role: 'member', status: 'pending', invitedBy: userId })),
            ],
          },
        },
        include: { members: { include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } } },
      });
      const creatorUser = group.members.find(m => m.userId === userId);
      const creatorName = creatorUser?.user?.displayName || creatorUser?.user?.username?.replace(/^@/, '') || 'Someone';
      const acceptedMembers = group.members.filter(m => (m as any).status === 'accepted');
      const groupForCreator = { ...group, members: acceptedMembers };
      io.to(`user:${userId}`).emit('group:created', { group: groupForCreator });
      const pendingMembers = group.members.filter(m => (m as any).status === 'pending');
      for (const m of pendingMembers) {
        io.to(`user:${m.userId}`).emit('group:invite', { groupId: group.id, groupName: group.name, memberCount: acceptedMembers.length, invitedBy: creatorName });
      }
      ack?.({ group: groupForCreator });
    } catch (e) { console.error('groups:create error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:update', async (data: { groupId: string; name?: string; description?: string }, ack?: Ack) => {
    try {
      if (!(await isGroupAdmin(userId, data.groupId))) { ack?.({ error: 'Only admins can edit' }); return; }
      const updated = await prisma.group.update({
        where: { id: data.groupId },
        data: { ...(data.name ? { name: data.name.trim() } : {}), ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}) },
        include: { members: { include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } } },
      });
      for (const m of updated.members) io.to(`user:${m.userId}`).emit('group:updated', { group: updated });
      ack?.({ group: updated });
    } catch (e) { console.error('groups:update error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:accept', async (data: { groupId: string }, ack?: Ack) => {
    try {
      const { groupId } = data;
      const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } });
      if (!membership) { ack?.({ error: 'Invite not found' }); return; }
      if (membership.status === 'accepted') { ack?.({ error: 'Already a member' }); return; }
      await prisma.groupMember.update({ where: { userId_groupId: { userId, groupId } }, data: { status: 'accepted' } });
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: { where: { status: 'accepted' }, include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } } },
      });
      if (!group) { ack?.({ error: 'Group not found' }); return; }
      const newMember = group.members.find(m => m.userId === userId);
      const memberPayload = newMember ? { id: newMember.id, userId: newMember.userId, role: newMember.role, user: newMember.user } : null;
      io.to(`user:${userId}`).emit('group:created', { group });
      for (const m of group.members) {
        if (m.userId === userId) continue;
        io.to(`user:${m.userId}`).emit('group:memberJoined', { groupId, userId, member: memberPayload });
      }
      if (membership.invitedBy) io.to(`user:${membership.invitedBy}`).emit('group:inviteAccepted', { groupId, groupName: group.name, acceptedBy: userId });
      const accepter = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, username: true } });
      const accepterName = accepter?.displayName || accepter?.username?.replace(/^@/, '') || 'Someone';
      await sendSystemMessage(io, groupId, `${accepterName} joined the group`);
      ack?.({ group });
    } catch (e) { console.error('groups:accept error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:decline', async (data: { groupId: string }, ack?: Ack) => {
    try {
      const { groupId } = data;
      const membership = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } });
      if (!membership) { ack?.({ error: 'Invite not found' }); return; }
      if (membership.status === 'accepted') { ack?.({ error: 'Already a member — use leave' }); return; }
      await prisma.groupMember.delete({ where: { userId_groupId: { userId, groupId } } });
      if (membership.invitedBy) {
        const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
        io.to(`user:${membership.invitedBy}`).emit('group:inviteDeclined', { groupId, groupName: group?.name, declinedBy: userId });
      }
      ack?.({ success: true });
    } catch (e) { console.error('groups:decline error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:members:add', async (data: { groupId: string; memberId: string }, ack?: Ack) => {
    try {
      const { groupId, memberId } = data;
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) { ack?.({ error: 'Group not found' }); return; }
      if (!(await isGroupAdmin(userId, groupId))) { ack?.({ error: 'Only admins can add members' }); return; }
      await prisma.groupMember.create({ data: { userId: memberId, groupId, status: 'pending', invitedBy: userId } });
      const updated = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: { where: { status: 'accepted' }, include: { user: { select: { id: true, username: true, displayName: true, profileImage: true } } } } },
      });
      const inviter = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, username: true } });
      const inviterName = inviter?.displayName || inviter?.username?.replace(/^@/, '') || 'Someone';
      io.to(`user:${memberId}`).emit('group:invite', { groupId, groupName: updated!.name, memberCount: updated!.members.length, invitedBy: inviterName });
      ack?.({ group: updated });
    } catch (e: any) {
      if (e.code === 'P2002') { ack?.({ error: 'User is already a member' }); return; }
      console.error('groups:members:add error:', e); ack?.({ error: 'Internal error' });
    }
  });

  socket.on('groups:members:remove', async (data: { groupId: string; memberId: string }, ack?: Ack) => {
    try {
      const { groupId, memberId } = data;
      const group = await prisma.group.findUnique({ where: { id: groupId }, include: { members: { include: { user: { select: { displayName: true, username: true } } } } } });
      if (!group) { ack?.({ error: 'Group not found' }); return; }
      const isSelf = memberId === userId;
      const callerMember = group.members.find(m => m.userId === userId);
      const targetMember = group.members.find(m => m.userId === memberId);
      if (!targetMember) { ack?.({ error: 'Member not found' }); return; }
      if (!isSelf) {
        if (callerMember?.role !== 'owner' && callerMember?.role !== 'admin') { ack?.({ error: 'Only admins can remove members' }); return; }
        if (targetMember.role === 'owner') { ack?.({ error: 'Cannot remove an owner' }); return; }
        if (targetMember.role === 'admin' && callerMember?.role !== 'owner') { ack?.({ error: 'Only owners can remove admins' }); return; }
      }
      const removedName = targetMember.user.displayName || targetMember.user.username?.replace(/^@/, '') || 'Someone';
      await prisma.groupMember.delete({ where: { userId_groupId: { userId: memberId, groupId } } });
      io.to(`user:${memberId}`).emit('group:removed', { groupId });
      const remaining = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
      for (const m of remaining) io.to(`user:${m.userId}`).emit('group:memberLeft', { groupId, memberId });
      if (targetMember.status !== 'pending') {
        await sendSystemMessage(io, groupId, isSelf ? `${removedName} left the group` : `${removedName} was removed from the group`);
      }
      ack?.({ success: true });
    } catch (e) { console.error('groups:members:remove error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:members:promote', async (data: { groupId: string; memberId: string }, ack?: Ack) => {
    try {
      const { groupId, memberId } = data;
      if (!(await isGroupAdmin(userId, groupId))) { ack?.({ error: 'Only admins can promote' }); return; }
      const target = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: memberId, groupId } } });
      if (!target) { ack?.({ error: 'Member not found' }); return; }
      await prisma.groupMember.update({ where: { id: target.id }, data: { role: 'admin' } });
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      for (const m of members) io.to(`user:${m.userId}`).emit('group:memberPromoted', { groupId, memberId, promotedBy: userId });
      ack?.({ success: true });
    } catch (e) { console.error('groups:members:promote error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:members:demote', async (data: { groupId: string; memberId: string }, ack?: Ack) => {
    try {
      const { groupId, memberId } = data;
      const callerIsOwner = await isGroupOwner(userId, groupId);
      if (!callerIsOwner && memberId !== userId) { ack?.({ error: 'Only owners can demote' }); return; }
      const target = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: memberId, groupId } } });
      if (!target) { ack?.({ error: 'Member not found' }); return; }
      if (target.role === 'owner') { ack?.({ error: 'Cannot demote an owner' }); return; }
      await prisma.groupMember.update({ where: { id: target.id }, data: { role: 'member' } });
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      for (const m of members) io.to(`user:${m.userId}`).emit('group:memberDemoted', { groupId, memberId, demotedBy: userId });
      ack?.({ success: true });
    } catch (e) { console.error('groups:members:demote error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:leave', async (data: { groupId: string }, ack?: Ack) => {
    try {
      const { groupId } = data;
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: { include: { user: { select: { displayName: true, username: true } } } } },
      });
      if (!group) { ack?.({ error: 'Group not found' }); return; }
      const leavingMember = group.members.find(m => m.userId === userId);
      const leavingName = leavingMember?.user.displayName || leavingMember?.user.username?.replace(/^@/, '') || 'Someone';
      const otherMembers = group.members.filter(m => m.userId !== userId);
      if (otherMembers.length === 0) {
        io.to(`user:${userId}`).emit('group:deleted', { groupId, groupName: group.name });
        await prisma.group.delete({ where: { id: groupId } });
        ack?.({ success: true, deleted: true }); return;
      }
      if (leavingMember?.role === 'owner') {
        const otherOwners = group.members.filter(m => m.role === 'owner' && m.userId !== userId);
        if (otherOwners.length === 0) {
          const newOwnerId = await promoteNextOwner(groupId, userId);
          if (newOwnerId) {
            for (const m of group.members) io.to(`user:${m.userId}`).emit('group:ownerChanged', { groupId, newOwnerId });
          }
        }
      }
      await prisma.groupMember.deleteMany({ where: { userId, groupId } });
      io.to(`user:${userId}`).emit('group:removed', { groupId });
      const remaining = await prisma.groupMember.findMany({ where: { groupId, status: 'accepted' } });
      for (const m of remaining) io.to(`user:${m.userId}`).emit('group:memberLeft', { groupId, memberId: userId });
      await sendSystemMessage(io, groupId, `${leavingName} left the group`);
      ack?.({ success: true, deleted: false });
    } catch (e) { console.error('groups:leave error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:delete', async (data: { groupId: string }, ack?: Ack) => {
    try {
      const { groupId } = data;
      const group = await prisma.group.findUnique({ where: { id: groupId }, include: { members: true } });
      if (!group) { ack?.({ error: 'Group not found' }); return; }
      if (group.members.find(m => m.userId === userId)?.role !== 'owner') { ack?.({ error: 'Only owners can delete' }); return; }
      for (const m of group.members) io.to(`user:${m.userId}`).emit('group:deleted', { groupId, groupName: group.name });
      await prisma.group.delete({ where: { id: groupId } });
      ack?.({ success: true });
    } catch (e) { console.error('groups:delete error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:transfer-ownership', async (data: { groupId: string; newOwnerId: string }, ack?: Ack) => {
    try {
      const { groupId, newOwnerId } = data;
      if (!newOwnerId) { ack?.({ error: 'newOwnerId is required' }); return; }
      if (!(await isGroupOwner(userId, groupId))) { ack?.({ error: 'Only owners can transfer' }); return; }
      const target = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId: newOwnerId, groupId } } });
      if (!target) { ack?.({ error: 'Member not found' }); return; }
      if (target.role === 'owner') { ack?.({ error: 'Already an owner' }); return; }
      if (target.role !== 'admin') { ack?.({ error: 'Only admins can be promoted to owner' }); return; }
      await prisma.groupMember.update({ where: { id: target.id }, data: { role: 'owner' } });
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      for (const m of members) io.to(`user:${m.userId}`).emit('group:ownershipTransferred', { groupId, newOwnerId });
      ack?.({ success: true });
    } catch (e) { console.error('groups:transfer-ownership error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('groups:step-down', async (data: { groupId: string }, ack?: Ack) => {
    try {
      const { groupId } = data;
      const caller = await prisma.groupMember.findUnique({ where: { userId_groupId: { userId, groupId } } });
      if (!caller || caller.role !== 'owner') { ack?.({ error: 'Only owners can step down' }); return; }
      const otherOwners = await prisma.groupMember.findMany({ where: { groupId, role: 'owner', userId: { not: userId } } });
      if (otherOwners.length === 0) { ack?.({ error: 'You are the only owner. Promote another member first.' }); return; }
      await prisma.groupMember.update({ where: { id: caller.id }, data: { role: 'admin' } });
      const members = await prisma.groupMember.findMany({ where: { groupId } });
      for (const m of members) io.to(`user:${m.userId}`).emit('group:ownerSteppedDown', { groupId, userId });
      ack?.({ success: true });
    } catch (e) { console.error('groups:step-down error:', e); ack?.({ error: 'Internal error' }); }
  });

  // ══════════════════════════════════════════════════════════════════════
  // CONVERSATIONS
  // ══════════════════════════════════════════════════════════════════════

  socket.on('conversations:request', async (_data: any, ack?: Ack) => {
    try {
      const result = await getConversations(userId);
      ack?.(result);
    } catch (e) { console.error('conversations:request error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('conversation:accept', async (data: { conversationId: string }, ack?: Ack) => {
    try {
      const updated = await acceptConversation(data.conversationId, userId);
      if (!updated) { ack?.({ error: 'Not authorised or not found' }); return; }
      await Promise.all([invalidateConversationCache(updated.participantA), invalidateConversationCache(updated.participantB)]);
      io.to(`user:${updated.initiatorId}`).emit('conversation:accepted', { conversationId: updated.id, acceptedBy: userId });
      ack?.({ conversation: updated });
    } catch (e) { console.error('conversation:accept error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('conversation:decline', async (data: { conversationId: string }, ack?: Ack) => {
    try {
      const result = await declineConversation(data.conversationId, userId);
      if (!result) { ack?.({ error: 'Not authorised or not found' }); return; }
      await Promise.all([invalidateConversationCache(result.participantA), invalidateConversationCache(result.participantB)]);
      io.to(`user:${result.initiatorId}`).emit('conversation:declined', { conversationId: data.conversationId, declinedBy: userId, otherUserId: userId });
      ack?.({ success: true });
    } catch (e) { console.error('conversation:decline error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('conversation:nuke', async (data: { conversationId: string }, ack?: Ack) => {
    try {
      const result = await nukeConversation(data.conversationId, userId);
      if (!result) { ack?.({ error: 'Not authorised or not found' }); return; }
      await Promise.all([invalidateConversationCache(result.participantA), invalidateConversationCache(result.participantB)]);
      io.to(`user:${result.participantA}`).emit('conversation:declined', { conversationId: data.conversationId, declinedBy: userId, otherUserId: result.participantB });
      io.to(`user:${result.participantB}`).emit('conversation:declined', { conversationId: data.conversationId, declinedBy: userId, otherUserId: result.participantA });
      const guests = await prisma.user.findMany({ where: { id: { in: [result.participantA, result.participantB] }, isGuest: true }, select: { id: true } });
      for (const g of guests) await deleteGuestUser(g.id);
      ack?.({ success: true });
    } catch (e) { console.error('conversation:nuke error:', e); ack?.({ error: 'Internal error' }); }
  });

  socket.on('conversation:nuke-by-user', async (data: { recipientId: string }, ack?: Ack) => {
    try {
      const result = await nukeByParticipants(userId, data.recipientId);
      if (!result) { ack?.({ error: 'Failed to nuke' }); return; }
      await Promise.all([invalidateConversationCache(result.participantA), invalidateConversationCache(result.participantB)]);
      io.to(`user:${result.participantA}`).emit('conversation:declined', { conversationId: null, declinedBy: userId, otherUserId: data.recipientId });
      io.to(`user:${result.participantB}`).emit('conversation:declined', { conversationId: null, declinedBy: userId, otherUserId: userId });
      const guests = await prisma.user.findMany({ where: { id: { in: [userId, data.recipientId] }, isGuest: true }, select: { id: true } });
      for (const g of guests) await deleteGuestUser(g.id);
      ack?.({ success: true });
    } catch (e) { console.error('conversation:nuke-by-user error:', e); ack?.({ error: 'Internal error' }); }
  });
}
