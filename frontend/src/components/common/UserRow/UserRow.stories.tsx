import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import UserRow from './UserRow';

const meta: Meta<typeof UserRow> = {
  title: 'Common/UserRow',
  component: UserRow,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Reusable user row with avatar, name, subtitle, presence dot, and optional badges/actions.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof UserRow>;

export const Default: Story = {
  args: {
    profileImage: null,
    displayName: 'Jane Doe',
    onClick: fn(),
  },
};

export const Online: Story = {
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=online',
    displayName: 'Alice Chen',
    presence: { status: 'online' as const, lastSeen: null },
    onClick: fn(),
  },
};

export const WithSubtitle: Story = {
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=subtitle',
    displayName: 'Bob Smith',
    subtitle: 'Last seen 5 minutes ago',
    onClick: fn(),
  },
};

export const WithBadge: Story = {
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=badge',
    displayName: 'Carol Admin',
    badges: React.createElement('span', {
      style: {
        background: '#3b82f6',
        color: '#fff',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 11,
        fontWeight: 600,
      },
    }, 'Admin'),
    onClick: fn(),
  },
};

export const WithActions: Story = {
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=actions',
    displayName: 'Dave Wilson',
    actions: React.createElement('button', {
      style: {
        background: '#3b82f6',
        color: '#fff',
        border: 'none',
        padding: '4px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: 12,
      },
    }, 'Add Friend'),
    onClick: fn(),
  },
};

export const Friend: Story = {
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=friend',
    displayName: 'Eve Martinez',
    isFriend: true,
    presence: { status: 'online' as const, lastSeen: null },
    onClick: fn(),
  },
};

export const LargeAvatar: Story = {
  args: {
    profileImage: 'https://i.pravatar.cc/112?u=large',
    displayName: 'Frank Lee',
    avatarSize: 56,
    presence: { status: 'online' as const, lastSeen: null },
    onClick: fn(),
  },
};

export const NoDot: Story = {
  args: {
    profileImage: 'https://i.pravatar.cc/80?u=nodot',
    displayName: 'Grace Kim',
    showPresenceDot: false,
    onClick: fn(),
  },
};
