import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import { PanelProvider } from '@/contexts/PanelContext';
import GroupView from './GroupView';
import type { GroupData, GroupMember } from './GroupView';

const mockMembers: GroupMember[] = [
  {
    id: 'mem-1',
    userId: 'user-owner',
    role: 'admin',
    user: { id: 'user-owner', username: '@alice', displayName: 'Alice Chen', profileImage: null },
  },
  {
    id: 'mem-2',
    userId: 'user-admin',
    role: 'admin',
    user: { id: 'user-admin', username: '@bob', displayName: 'Bob Park', profileImage: null },
  },
  {
    id: 'mem-3',
    userId: 'user-member',
    role: 'member',
    user: { id: 'user-member', username: '@carol', displayName: 'Carol Davis', profileImage: null },
  },
];

const mockGroup: GroupData = {
  id: 'group-1',
  name: 'Project Alpha',
  description: 'Main project discussion group',
  profileImage: null,
  coverImage: null,
  ownerId: 'user-owner',
  members: mockMembers,
};

const meta: Meta<typeof GroupView> = {
  title: 'Messaging/GroupView',
  component: GroupView,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Full group chat view with message list, input, and group header.' } },
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
                  <div style={{ width: 700, height: 700, background: '#0f172a' }}>
                    <Story />
                  </div>
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
type Story = StoryObj<typeof GroupView>;

const baseArgs = {
  group: mockGroup,
  isDark: true,
  currentUserId: 'user-owner',
  onGroupDeleted: fn(),
};

export const Default: Story = { args: baseArgs };

export const AsMember: Story = {
  args: { ...baseArgs, currentUserId: 'user-member' },
};

export const PendingInvite: Story = {
  args: { ...baseArgs, initialMemberStatus: 'pending' as const },
};

export const LightMode: Story = {
  args: { ...baseArgs, isDark: false },
  decorators: [
    (Story) => (
      <div style={{ background: '#ffffff' }}>
        <Story />
      </div>
    ),
  ],
};
