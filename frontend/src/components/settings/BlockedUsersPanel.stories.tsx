import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { FriendsProvider } from '@/contexts/FriendsContext';
import BlockedUsersPanel from './BlockedUsersPanel';

const meta: Meta<typeof BlockedUsersPanel> = {
  title: 'Settings/BlockedUsersPanel',
  component: BlockedUsersPanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Panel listing blocked users with option to unblock them.' } },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <WebSocketProvider>
            <PresenceProvider>
              <ConfirmationProvider>
                <PanelProvider>
                  <FriendsProvider>
                    <div style={{ width: 380, height: 600, background: '#0f172a' }}>
                      <Story />
                    </div>
                  </FriendsProvider>
                </PanelProvider>
              </ConfirmationProvider>
            </PresenceProvider>
          </WebSocketProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BlockedUsersPanel>;

export const Default: Story = {};
