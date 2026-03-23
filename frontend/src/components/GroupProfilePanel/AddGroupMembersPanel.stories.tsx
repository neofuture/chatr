import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { ToastProvider } from '@/contexts/ToastContext';
import AddGroupMembersPanel from './AddGroupMembersPanel';

const meta: Meta<typeof AddGroupMembersPanel> = {
  title: 'Panels/AddGroupMembersPanel',
  component: AddGroupMembersPanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Panel for searching and adding new members to a group.' } },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <WebSocketProvider>
        <PresenceProvider>
          <ToastProvider>
            <div style={{ width: 380, height: 600, background: '#0f172a' }}>
              <Story />
            </div>
          </ToastProvider>
        </PresenceProvider>
      </WebSocketProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AddGroupMembersPanel>;

export const Default: Story = {
  args: {
    groupId: 'g1',
    existingMemberIds: ['u1', 'u2'],
    onMembersAdded: fn(),
  },
};

export const EmptyGroup: Story = {
  args: {
    groupId: 'g1',
    existingMemberIds: [],
    onMembersAdded: fn(),
  },
};
