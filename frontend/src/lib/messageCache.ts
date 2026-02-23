/**
 * messageCache.ts
 * Dexie-backed helpers for persisting conversation messages locally.
 * Used by useConversation to:
 *  - Show cached messages instantly on load / refresh
 *  - Write new/updated messages back to the cache
 *  - Merge server history on top of the cache (server wins)
 */

import { db, CachedMessage } from './db';
import type { Message } from '@/components/MessageBubble';

// Canonical key for a conversation — always sorted so both sides share the same key
export function conversationKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

// Convert a Message (frontend type) → CachedMessage (DB type)
export function toCached(msg: Message, currentUserId: string): CachedMessage {
  const other = msg.senderId === currentUserId ? msg.recipientId : msg.senderId;
  return {
    id: msg.id,
    conversationKey: conversationKey(currentUserId, other),
    senderId: msg.senderId,
    senderUsername: msg.senderUsername || '',
    senderDisplayName: msg.senderDisplayName ?? null,
    senderProfileImage: msg.senderProfileImage ?? null,
    recipientId: msg.recipientId,
    content: msg.content,
    type: msg.type || 'text',
    status: msg.status,
    timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : Number(msg.timestamp),
    fileUrl: msg.fileUrl ?? null,
    fileName: msg.fileName ?? null,
    fileSize: msg.fileSize ?? null,
    fileType: msg.fileType ?? null,
    waveformData: msg.waveformData ?? null,
    duration: msg.duration ?? null,
    reactions: msg.reactions ?? [],
    replyTo: msg.replyTo ?? null,
    unsent: msg.unsent ?? false,
    edited: msg.edited ?? false,
  };
}

// Convert a CachedMessage (DB type) → Message (frontend type)
export function fromCached(c: CachedMessage, currentUserId: string): Message {
  return {
    id: c.id,
    senderId: c.senderId,
    senderUsername: c.senderUsername,
    senderDisplayName: c.senderDisplayName,
    senderProfileImage: c.senderProfileImage,
    recipientId: c.recipientId,
    content: c.content,
    direction: c.senderId === currentUserId ? 'sent' : 'received',
    status: c.status as Message['status'],
    timestamp: new Date(c.timestamp),
    type: c.type as Message['type'],
    fileUrl: c.fileUrl ?? undefined,
    fileName: c.fileName ?? undefined,
    fileSize: c.fileSize ?? undefined,
    fileType: c.fileType ?? undefined,
    waveformData: c.waveformData ?? undefined,
    duration: c.duration ?? undefined,
    reactions: c.reactions ?? [],
    replyTo: c.replyTo ?? undefined,
    unsent: c.unsent,
    edited: c.edited ?? false,
  };
}

/** Load all cached messages for a conversation, sorted oldest → newest */
export async function loadCachedMessages(
  currentUserId: string,
  otherUserId: string
): Promise<Message[]> {
  const key = conversationKey(currentUserId, otherUserId);
  const rows = await db.cachedMessages
    .where('conversationKey').equals(key)
    .sortBy('timestamp');
  return rows.map(r => fromCached(r, currentUserId));
}

/** Write a batch of messages to the cache (upsert — server wins on conflict) */
export async function cacheMessages(
  messages: Message[],
  currentUserId: string
): Promise<void> {
  if (messages.length === 0) return;
  const rows = messages.map(m => toCached(m, currentUserId));
  await db.cachedMessages.bulkPut(rows);
}

/** Upsert a single message (e.g. on send / receive / status update) */
export async function cacheMessage(
  msg: Message,
  currentUserId: string
): Promise<void> {
  await db.cachedMessages.put(toCached(msg, currentUserId));
}

/** Update a specific field on a cached message (e.g. status, reactions, unsent) */
export async function updateCachedMessage(
  id: string,
  changes: Partial<CachedMessage>
): Promise<void> {
  await db.cachedMessages.update(id, changes);
}

/** Delete a message from cache (used when unsent — we keep it but mark unsent) */
export async function deleteCachedMessage(id: string): Promise<void> {
  await db.cachedMessages.delete(id);
}

/** Replace temp optimistic ID with the real server ID after send confirmation */
export async function replaceCachedMessageId(
  tempId: string,
  realId: string,
  changes: Partial<CachedMessage> = {}
): Promise<void> {
  const existing = await db.cachedMessages.get(tempId);
  if (!existing) return;
  await db.cachedMessages.delete(tempId);
  await db.cachedMessages.put({ ...existing, id: realId, ...changes });
}

