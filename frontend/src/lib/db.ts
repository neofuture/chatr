import Dexie, { Table } from 'dexie';

// Define types for our data
export interface OfflineMessage {
  id: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  content: string;
  createdAt: Date;
  synced: boolean;
  localOnly?: boolean;
}

export interface OfflineUser {
  id: string;
  username: string;
  email: string;
  lastSynced: Date;
}

export interface OfflineGroup {
  id: string;
  name: string;
  description?: string;
  lastSynced: Date;
}

export interface ProfileImage {
  userId: string;          // Primary key - user ID
  imageData: Blob;         // The actual image file as Blob
  mimeType: string;        // e.g., 'image/jpeg', 'image/png'
  uploadedAt: Date;        // When it was uploaded/stored locally
  synced: boolean;         // Whether it's been synced to server
  url?: string;            // Server URL after upload (optional)
  thumbnail?: Blob;        // Optional smaller thumbnail version
}

export interface CoverImage {
  userId: string;          // Primary key - user ID
  imageData: Blob;         // The actual image file as Blob
  mimeType: string;        // e.g., 'image/jpeg', 'image/png'
  uploadedAt: Date;        // When it was uploaded/stored locally
  synced: boolean;         // Whether it's been synced to server
  url?: string;            // Server URL after upload (optional)
  thumbnail?: Blob;        // Optional smaller thumbnail version
}

// Full message cache for conversations
export interface CachedMessage {
  id: string;
  conversationKey: string;  // `${userId}:${otherUserId}` — sorted so A:B === B:A
  senderId: string;
  senderUsername: string;
  senderDisplayName: string | null;
  senderProfileImage: string | null;
  recipientId: string;
  content: string;
  type: string;
  status: string;
  timestamp: number;        // epoch ms — easier to index/sort than Date
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileType: string | null;
  waveformData: number[] | null;
  duration: number | null;
  reactions: any[];
  replyTo: any | null;
  unsent: boolean;
  edited?: boolean;
}

// Dexie database class
export class ChatrDB extends Dexie {
  messages!: Table<OfflineMessage>;
  users!: Table<OfflineUser>;
  groups!: Table<OfflineGroup>;
  profileImages!: Table<ProfileImage>;
  coverImages!: Table<CoverImage>;
  cachedMessages!: Table<CachedMessage>;

  constructor() {
    super('chatr');

    this.version(1).stores({
      messages: 'id, senderId, recipientId, groupId, createdAt, synced',
      users: 'id, username',
      groups: 'id, name',
    });

    // Add profileImages table in version 2
    this.version(2).stores({
      messages: 'id, senderId, recipientId, groupId, createdAt, synced',
      users: 'id, username',
      groups: 'id, name',
      profileImages: 'userId, synced, uploadedAt',
    });

    // Add coverImages table in version 3
    this.version(3).stores({
      messages: 'id, senderId, recipientId, groupId, createdAt, synced',
      users: 'id, username',
      groups: 'id, name',
      profileImages: 'userId, synced, uploadedAt',
      coverImages: 'userId, synced, uploadedAt',
    });

    // Version 4 — add cachedMessages for conversation persistence
    this.version(4).stores({
      messages: 'id, senderId, recipientId, groupId, createdAt, synced',
      users: 'id, username',
      groups: 'id, name',
      profileImages: 'userId, synced, uploadedAt',
      coverImages: 'userId, synced, uploadedAt',
      cachedMessages: 'id, conversationKey, timestamp',
    });

    // Version 5 — add edited flag to cachedMessages (no new index needed)
    this.version(5).stores({
      messages: 'id, senderId, recipientId, groupId, createdAt, synced',
      users: 'id, username',
      groups: 'id, name',
      profileImages: 'userId, synced, uploadedAt',
      coverImages: 'userId, synced, uploadedAt',
      cachedMessages: 'id, conversationKey, timestamp',
    });
  }
}

// Create singleton instance
export const db = new ChatrDB();

