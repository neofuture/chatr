import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import MessageInput from './MessageInput';

const meta: Meta<typeof MessageInput> = {
  title: 'Messaging/MessageInput',
  component: MessageInput,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full chat input bar with text entry, emoji picker, file attachments, and voice recorder. Handles typing indicators and edit/reply modes.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <PanelProvider>
            <div style={{ background: '#0f172a', padding: 16, maxWidth: 600 }}>
              <Story />
            </div>
          </PanelProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MessageInput>;

export const Default: Story = {
  args: {
    isDark: true,
    recipientId: 'user-123',
    onMessageSent: (msg) => console.log('Sent:', msg),
  },
};

export const InReplyMode: Story = {
  args: {
    isDark: true,
    recipientId: 'user-123',
    replyingTo: {
      id: 'msg-1',
      content: 'Hey, want to meet up later?',
      senderId: 'user-123',
      senderDisplayName: 'Simon James',
      senderUsername: '@simonjames',
      recipientId: 'current',
      direction: 'received' as const,
      type: 'text',
      status: 'delivered',
      timestamp: new Date(),
      unsent: false,
      edited: false,
      reactions: [],
    },
    onCancelReply: () => console.log('Reply cancelled'),
  },
};

export const InEditMode: Story = {
  args: {
    isDark: true,
    recipientId: 'user-123',
    editingMessage: {
      id: 'msg-2',
      content: 'This is the original message text',
      senderId: 'current',
      senderDisplayName: 'Me',
      senderUsername: '@me',
      recipientId: 'user-123',
      direction: 'sent' as const,
      type: 'text',
      status: 'delivered',
      timestamp: new Date(),
      unsent: false,
      edited: false,
      reactions: [],
    },
    onCancelEdit: () => console.log('Edit cancelled'),
    onEditSaved: (id, content) => console.log('Edited:', id, content),
  },
};

export const LightTheme: Story = {
  args: {
    isDark: false,
    recipientId: 'user-123',
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <PanelProvider>
            <div style={{ background: '#f8fafc', padding: 16, maxWidth: 600 }}>
              <Story />
            </div>
          </PanelProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

