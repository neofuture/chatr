import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { FriendsProvider } from '@/contexts/FriendsContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import ConversationView from './ConversationView';

const meta: Meta<typeof ConversationView> = {
  title: 'Messaging/ConversationView',
  component: ConversationView,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full conversation panel combining ChatView (scrollable message list) and MessageInput (footer input bar). Manages its own WebSocket listeners via useConversationView.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <ConfirmationProvider>
            <WebSocketProvider>
              <PresenceProvider>
                <FriendsProvider>
                  <PanelProvider>
                    <div style={{ width: '100%', height: 600, background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
                      <Story />
                    </div>
                  </PanelProvider>
                </FriendsProvider>
              </PresenceProvider>
            </WebSocketProvider>
          </ConfirmationProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ConversationView>;

export const Default: Story = {
  args: {
    recipientId: 'user-story-123',
    isDark: true,
  },
};

export const LightTheme: Story = {
  args: {
    recipientId: 'user-story-123',
    isDark: false,
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <ConfirmationProvider>
            <WebSocketProvider>
              <PresenceProvider>
                <FriendsProvider>
                  <PanelProvider>
                    <div style={{ width: '100%', height: 600, background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                      <Story />
                    </div>
                  </PanelProvider>
                </FriendsProvider>
              </PresenceProvider>
            </WebSocketProvider>
          </ConfirmationProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

