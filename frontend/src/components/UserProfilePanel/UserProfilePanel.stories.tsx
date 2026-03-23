import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import { FriendsProvider } from '@/contexts/FriendsContext';
import UserProfilePanel from './UserProfilePanel';

const meta: Meta<typeof UserProfilePanel> = {
  title: 'Panels/UserProfilePanel',
  component: UserProfilePanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Profile panel showing user details, friendship status, and action buttons.' } },
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
                  <div style={{ width: 380, height: 700, background: '#0f172a' }}>
                    <Story />
                  </div>
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
type Story = StoryObj<typeof UserProfilePanel>;

export const Default: Story = {
  args: { userId: 'test-user-1' },
};

export const AnotherUser: Story = {
  args: { userId: 'test-user-2' },
};
