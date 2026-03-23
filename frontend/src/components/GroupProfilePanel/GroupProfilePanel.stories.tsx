import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import GroupProfilePanel from './GroupProfilePanel';

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  status?: string;
  user: { id: string; username: string; displayName: string | null; profileImage: string | null };
}

interface GroupInfo {
  id: string;
  name: string;
  description?: string | null;
  profileImage?: string | null;
  coverImage?: string | null;
  ownerId?: string;
  members: GroupMember[];
}

const members: GroupMember[] = [
  {
    id: 'm1', userId: 'u1', role: 'owner', status: 'accepted',
    user: { id: 'u1', username: '@alice', displayName: 'Alice Johnson', profileImage: null },
  },
  {
    id: 'm2', userId: 'u2', role: 'admin', status: 'accepted',
    user: { id: 'u2', username: '@bob', displayName: 'Bob Smith', profileImage: null },
  },
  {
    id: 'm3', userId: 'u3', role: 'member', status: 'accepted',
    user: { id: 'u3', username: '@charlie', displayName: 'Charlie Davis', profileImage: null },
  },
];

const baseGroup: GroupInfo = {
  id: 'g1',
  name: 'Design Team',
  description: 'A group for the design team to collaborate.',
  profileImage: null,
  coverImage: null,
  ownerId: 'u1',
  members,
};

const meta: Meta<typeof GroupProfilePanel> = {
  title: 'Panels/GroupProfilePanel',
  component: GroupProfilePanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Side panel showing group details, members list, and admin controls.' } },
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
                  <div style={{ width: 380, height: 700, background: '#0f172a' }}>
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
type Story = StoryObj<typeof GroupProfilePanel>;

export const Default: Story = {
  args: {
    groupId: 'g1',
    currentUserId: 'u1',
    onGroupLeft: fn(),
    initialGroup: baseGroup,
  },
};

export const AsAdmin: Story = {
  args: {
    groupId: 'g1',
    currentUserId: 'u2',
    onGroupLeft: fn(),
    initialGroup: baseGroup,
  },
};

export const AsMember: Story = {
  args: {
    groupId: 'g1',
    currentUserId: 'u3',
    onGroupLeft: fn(),
    initialGroup: baseGroup,
  },
};

export const NoDescription: Story = {
  args: {
    groupId: 'g1',
    currentUserId: 'u1',
    onGroupLeft: fn(),
    initialGroup: { ...baseGroup, description: null },
  },
};
