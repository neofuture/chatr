import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ChatView from './ChatView';
import type { Message } from '@/components/MessageBubble';

const endRef = { current: null };

const messages: Message[] = [
  {
    id: '1', content: 'Hey! How are you doing?', senderId: 'user1',
    senderDisplayName: 'Simon James', senderUsername: '@simonjames',
    recipientId: 'me', direction: 'received', type: 'text', status: 'delivered',
    timestamp: new Date(Date.now() - 10 * 60 * 1000), unsent: false, edited: false, reactions: [],
  },
  {
    id: '2', content: 'Good thanks! Just working on some stuff 👍', senderId: 'me',
    senderDisplayName: 'Me', senderUsername: '@me',
    recipientId: 'user1', direction: 'sent', type: 'text', status: 'read',
    timestamp: new Date(Date.now() - 9 * 60 * 1000), unsent: false, edited: false, reactions: [],
  },
  {
    id: '3', content: 'Nice! What are you building?', senderId: 'user1',
    senderDisplayName: 'Simon James', senderUsername: '@simonjames',
    recipientId: 'me', direction: 'received', type: 'text', status: 'delivered',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), unsent: false, edited: false,
    reactions: [{ emoji: '👍', userId: 'me', username: '@me' }],
  },
  {
    id: '4', content: 'A chat app 😄', senderId: 'me',
    senderDisplayName: 'Me', senderUsername: '@me',
    recipientId: 'user1', direction: 'sent', type: 'text', status: 'delivered',
    timestamp: new Date(Date.now() - 2 * 60 * 1000), unsent: false, edited: true, reactions: [],
  },
];

const meta: Meta<typeof ChatView> = {
  title: 'Messaging/ChatView',
  component: ChatView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Scrollable message list with typing/recording indicators. Handles reactions, unsend, reply, edit, image lightbox, and audio playback.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <div style={{ width: '100%', height: 500, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
            <Story />
          </div>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatView>;

const baseArgs = {
  messages,
  isDark: true,
  messagesEndRef: endRef as React.RefObject<HTMLDivElement | null>,
  isRecipientTyping: false,
  isRecipientRecording: false,
  recipientGhostText: '',
  listeningMessageIds: new Set<string>(),
  activeAudioMessageId: null,
  currentUserId: 'me',
  onReaction: (id: string, emoji: string) => console.log('React', id, emoji),
  onUnsend: (id: string) => console.log('Unsend', id),
  onReply: (msg: Message) => console.log('Reply', msg),
  onImageClick: (url: string, name: string) => console.log('Image', url, name),
  onAudioPlayStatusChange: () => {},
  onEdit: (msg: Message) => console.log('Edit', msg),
};

export const Default: Story = { args: baseArgs };

export const RecipientTyping: Story = {
  args: { ...baseArgs, isRecipientTyping: true, recipientGhostText: 'typing something...' },
};

export const RecipientRecording: Story = {
  args: { ...baseArgs, isRecipientRecording: true },
};

export const Empty: Story = {
  args: { ...baseArgs, messages: [] },
};
