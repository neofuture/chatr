import { db, OfflineMessage } from './db';

// Save message to IndexedDB when offline
export async function saveMessageOffline(message: OfflineMessage) {
  await db.messages.add(message);
}

// Get all unsynced messages
export async function getUnsyncedMessages() {
  return await db.messages.where('synced').equals(0).toArray();
}

// Get messages for a conversation (user or group)
export async function getOfflineMessages(recipientId?: string, groupId?: string) {
  if (groupId) {
    return await db.messages.where('groupId').equals(groupId).toArray();
  } else if (recipientId) {
    return await db.messages
      .where('recipientId')
      .equals(recipientId)
      .or('senderId')
      .equals(recipientId)
      .toArray();
  }
  return [];
}

// Mark message as synced
export async function markMessageSynced(messageId: string) {
  await db.messages.update(messageId, { synced: true });
}

// Sync all offline messages to server
export async function syncOfflineMessages(token: string) {
  const unsyncedMessages = await getUnsyncedMessages();

  for (const message of unsyncedMessages) {
    try {
      // Send to server via API
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: message.recipientId,
          groupId: message.groupId,
          content: message.content,
        }),
      });

      if (response.ok) {
        await markMessageSynced(message.id);
      }
    } catch (error) {
      console.error('Failed to sync message:', message.id, error);
    }
  }
}

// Check if online
export function isOnline() {
  return navigator.onLine;
}

// Clear old synced messages (keep last 7 days)
export async function cleanupOldMessages() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  await db.messages
    .filter(msg => msg.synced && msg.createdAt < sevenDaysAgo)
    .delete();
}

