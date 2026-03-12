/**
 * outboundQueue.ts
 *
 * Persistent queue for outbound messages that have not yet been confirmed
 * by the server. Survives page navigation, refresh, and reconnects.
 *
 * Flow:
 *  1. User sends a message → enqueue() writes to IndexedDB, message shown as "sending"
 *  2. Socket emits the message
 *  3. Server replies with message:sent → dequeue() removes from queue
 *  4. If user navigates away and back, loadQueue() restores "sending" messages
 *  5. On reconnect, flushQueue() re-emits any still-queued messages
 */

import { db, OutboundMessage } from './db';
import type { Message } from '@/components/MessageBubble';

/** Add a message to the outbound queue */
export async function enqueue(msg: Message, groupId?: string): Promise<void> {
  const entry: OutboundMessage = {
    tempId: msg.id,
    recipientId: msg.recipientId,
    senderId: msg.senderId,
    content: msg.content,
    type: msg.type ?? 'text',
    timestamp: msg.timestamp instanceof Date ? msg.timestamp.getTime() : Number(msg.timestamp),
    replyTo: msg.replyTo ?? null,
    fileUrl: msg.fileUrl ?? null,
    fileName: msg.fileName ?? null,
    fileSize: msg.fileSize ?? null,
    fileType: msg.fileType ?? null,
    waveformData: msg.waveformData ?? null,
    duration: msg.duration ?? null,
    status: 'sending',
    attempts: 1,
    queuedAt: Date.now(),
    groupId: groupId ?? null,
  };
  await db.outboundQueue.put(entry);
}

/** Remove a message from the queue once the server has confirmed it */
export async function dequeue(tempId: string): Promise<void> {
  await db.outboundQueue.delete(tempId);
}

/** Load all queued messages for a specific recipient, oldest first */
export async function loadQueueForRecipient(
  senderId: string,
  recipientId: string
): Promise<Message[]> {
  const rows = await db.outboundQueue
    .where('recipientId').equals(recipientId)
    .filter(r => r.senderId === senderId)
    .sortBy('queuedAt');

  return rows.map(r => queuedToMessage(r));
}

/** Load ALL queued messages for a sender (used on reconnect) */
export async function loadAllQueued(senderId: string): Promise<OutboundMessage[]> {
  return db.outboundQueue
    .where('senderId').equals(senderId)
    .sortBy('queuedAt');
}

/** Load queued messages for a specific group, oldest first */
export async function loadQueueForGroup(
  senderId: string,
  groupId: string
): Promise<Message[]> {
  const rows = await db.outboundQueue
    .where('recipientId').equals(groupId)
    .filter(r => r.senderId === senderId && r.groupId === groupId)
    .sortBy('queuedAt');

  return rows.map(r => queuedToMessage(r));
}

/** Mark a queued message as failed and increment attempt count */
export async function markFailed(tempId: string): Promise<void> {
  const existing = await db.outboundQueue.get(tempId);
  if (!existing) return;
  await db.outboundQueue.put({ ...existing, status: 'failed', attempts: existing.attempts + 1 });
}

/** Convert a queued DB row back to a Message for display */
export function queuedToMessage(row: OutboundMessage): Message {
  return {
    id: row.tempId,
    content: row.content,
    senderId: row.senderId,
    recipientId: row.recipientId,
    direction: 'sent',
    status: row.status === 'failed' ? 'failed' : 'sending',
    timestamp: new Date(row.timestamp),
    type: row.type as Message['type'],
    replyTo: row.replyTo ?? undefined,
    fileUrl: row.fileUrl ?? undefined,
    fileName: row.fileName ?? undefined,
    fileSize: row.fileSize ?? undefined,
    fileType: row.fileType ?? undefined,
    waveformData: row.waveformData ?? undefined,
    duration: row.duration ?? undefined,
  };
}

