import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import NewChatPanel from './NewChatPanel';

const meta: Meta<typeof NewChatPanel> = {
  title: 'Messaging/NewChatPanel',
  component: NewChatPanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Panel for searching and selecting a user to start a new direct message conversation.' } },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <WebSocketProvider>
        <PresenceProvider>
          <div style={{ width: 380, height: 600, background: '#0f172a' }}>
            <Story />
          </div>
        </PresenceProvider>
      </WebSocketProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NewChatPanel>;

export const Default: Story = {
  args: {
    isDark: true,
    onSelectUser: fn(),
  },
};

export const LightMode: Story = {
  args: {
    isDark: false,
    onSelectUser: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ background: '#ffffff' }}>
        <Story />
      </div>
    ),
  ],
};
