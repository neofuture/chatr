import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { FriendsProvider } from '@/contexts/FriendsContext';
import { UserSettingsProvider } from '@/contexts/UserSettingsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import PrivacyPanel from './PrivacyPanel';

const meta: Meta<typeof PrivacyPanel> = {
  title: 'Settings/PrivacyPanel',
  component: PrivacyPanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Privacy settings panel controlling who can see online status, phone, email, and other profile fields.' } },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <WebSocketProvider>
            <PresenceProvider>
              <PanelProvider>
                <UserSettingsProvider>
                  <FriendsProvider>
                    <div style={{ width: 380, height: 700, background: '#0f172a' }}>
                      <Story />
                    </div>
                  </FriendsProvider>
                </UserSettingsProvider>
              </PanelProvider>
            </PresenceProvider>
          </WebSocketProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PrivacyPanel>;

export const Default: Story = {};
