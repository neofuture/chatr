export interface LogEntry {
  id: string;
  type: 'sent' | 'received' | 'info' | 'error';
  event: string;
  data: any;
  timestamp: Date;
}

export interface AvailableUser {
  id: string;
  username: string;
  displayName?: string | null;
  profileImage?: string | null;
  email: string;
}

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PresenceInfo {
  status: PresenceStatus;
  lastSeen: Date | null;
}

export interface ConversationSummary {
  userId: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  lastSenderId: string;
}
