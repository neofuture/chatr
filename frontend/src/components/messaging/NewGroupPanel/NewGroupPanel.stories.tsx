import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import NewGroupPanel from './NewGroupPanel';

const meta: Meta<typeof NewGroupPanel> = {
  title: 'Messaging/NewGroupPanel',
  component: NewGroupPanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Panel for creating a new group with name, description, and member selection.' } },
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
type Story = StoryObj<typeof NewGroupPanel>;

export const Default: Story = {
  args: {
    onGroupCreated: fn(),
  },
};
