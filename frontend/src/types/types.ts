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
  firstName?: string | null;
  lastName?: string | null;
  profileImage?: string | null;
  email: string;
}

export type PresenceStatus = 'online' | 'away' | 'offline';

export interface PresenceInfo {
  status: PresenceStatus;
  lastSeen: Date | null;
  /** User has chosen to hide their online status */
  hidden?: boolean;
}

export interface ConversationSummary {
  userId: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  lastSenderId: string;
  conversationId?: string | null;
  conversationStatus?: 'pending' | 'accepted' | null;
  isInitiator?: boolean;
  isFriend?: boolean;
}

export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface FriendshipMeta {
  id: string;
  status: FriendshipStatus;
  /** true if the current user sent this request */
  iRequested: boolean;
}

export interface FriendUser extends AvailableUser {
  friendship: FriendshipMeta | null;
}

export interface FriendEntry {
  friendshipId: string;
  since: string;
  user: AvailableUser;
}

export interface FriendRequest {
  friendshipId: string;
  createdAt: string;
  user: AvailableUser;
}


