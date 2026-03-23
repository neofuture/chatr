import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ConversationsList from './ConversationsList';
import type { PresenceInfo } from '@/types/types';
import type { ConversationUser } from '@/hooks/useConversationList';

const meta: Meta<typeof ConversationsList> = {
  title: 'Messaging/ConversationsList',
  component: ConversationsList,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Scrollable list of conversations. Shows no tabs when all chats are from friends; shows All/Chats/Requests tabs when message requests exist. Displays avatar, name, last message/presence flip, friend indicators, and online dot.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <PanelProvider>
            <div style={{ width: 360, height: 600, background: '#0f172a' }}>
              <Story />
            </div>
          </PanelProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConversationsList>;

const conversations: ConversationUser[] = [
  {
    id: 'u1', username: '@simonjames', displayName: 'Simon James', firstName: 'Simon', lastName: 'James',
    profileImage: null, lastSeen: null,
    lastMessage: { id: 'm1', content: 'Hey, how are you?', type: 'text', createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), senderId: 'u1', isRead: false, fileType: null },
    unreadCount: 2, lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    conversationId: 'c1', conversationStatus: 'accepted', isInitiator: false, isFriend: true,
  },
  {
    id: 'u2', username: '@aceburns', displayName: 'Ace Burns', firstName: 'Ace', lastName: 'Burns',
    profileImage: null, lastSeen: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    lastMessage: { id: 'm2', content: 'See you tomorrow!', type: 'text', createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), senderId: 'current', isRead: true, fileType: null },
    unreadCount: 0, lastMessageAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    conversationId: 'c2', conversationStatus: 'accepted', isInitiator: true, isFriend: true,
  },
  {
    id: 'u3', username: '@carolking', displayName: 'Carol King', firstName: 'Carol', lastName: 'King',
    profileImage: null, lastSeen: null,
    lastMessage: { id: 'm3', content: 'Thanks for the help', type: 'text', createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), senderId: 'u3', isRead: false, fileType: null },
    unreadCount: 1, lastMessageAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    conversationId: 'c3', conversationStatus: 'pending', isInitiator: false, isFriend: false,
  },
  {
    id: 'u4', username: '@davidmoss', displayName: 'David Moss', firstName: 'David', lastName: 'Moss',
    profileImage: null, lastSeen: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    lastMessage: { id: 'm4', content: 'Hello there', type: 'text', createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(), senderId: 'current', isRead: true, fileType: null },
    unreadCount: 0, lastMessageAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    conversationId: 'c4', conversationStatus: 'pending', isInitiator: true, isFriend: false,
  },
];

const presence: Record<string, PresenceInfo> = {
  u1: { status: 'online', lastSeen: null },
  u2: { status: 'offline', lastSeen: new Date(Date.now() - 15 * 60 * 1000) },
  u3: { status: 'away', lastSeen: null },
  u4: { status: 'offline', lastSeen: new Date(Date.now() - 2 * 3600 * 1000) },
};

const friendsOnly: ConversationUser[] = conversations.filter(c =>
  c.conversationStatus === 'accepted' || (c.conversationStatus === 'pending' && c.isInitiator)
);

const defaultArgs = {
  isDark: true,
  conversations,
  selectedUserId: '',
  userPresence: presence,
  currentUserId: 'current',
  onSelectUser: (id: string) => console.log('Selected:', id),
  search: '',
  onSearchChange: () => {},
  loading: false,
  groups: [],
  groupsLoading: false,
  selectedGroupId: '',
  onSelectGroup: () => {},
};

export const WithTabs: Story = {
  name: 'With Requests (All/Chats/Requests tabs)',
  args: defaultArgs,
};

export const FriendsOnly: Story = {
  name: 'Friends Only (no tabs)',
  args: {
    ...defaultArgs,
    conversations: friendsOnly,
  },
};

export const WithSelected: Story = {
  args: {
    ...defaultArgs,
    selectedUserId: 'u1',
  },
};

export const Empty: Story = {
  args: {
    ...defaultArgs,
    conversations: [],
  },
};
