export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId?: string;
  groupId?: string;
  createdAt: string;
  read: boolean;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

