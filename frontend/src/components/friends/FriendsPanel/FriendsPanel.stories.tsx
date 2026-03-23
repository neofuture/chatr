import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { FriendsProvider } from '@/contexts/FriendsContext';
import FriendsPanel from './FriendsPanel';

const meta: Meta<typeof FriendsPanel> = {
  title: 'Social/FriendsPanel',
  component: FriendsPanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Panel showing friends list with tabs for all friends, incoming requests, outgoing requests, and blocked users.' } },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <ConfirmationProvider>
            <WebSocketProvider>
              <PresenceProvider>
                <PanelProvider>
                  <FriendsProvider>
                    <div style={{ width: 380, height: 600, background: '#0f172a' }}>
                      <Story />
                    </div>
                  </FriendsProvider>
                </PanelProvider>
              </PresenceProvider>
            </WebSocketProvider>
          </ConfirmationProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FriendsPanel>;

export const Default: Story = {
  args: {
    onStartChat: fn(),
  },
};

export const WithoutChatCallback: Story = {
  args: {},
};
