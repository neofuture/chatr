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

// Dexie database class
export class ChatrDB extends Dexie {
  messages!: Table<OfflineMessage>;
  users!: Table<OfflineUser>;
  groups!: Table<OfflineGroup>;
  profileImages!: Table<ProfileImage>;
  coverImages!: Table<CoverImage>;

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
  }
}

// Create singleton instance
export const db = new ChatrDB();

