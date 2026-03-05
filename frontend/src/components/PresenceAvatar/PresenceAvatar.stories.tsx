import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import PresenceAvatar from './PresenceAvatar';

const meta: Meta<typeof PresenceAvatar> = {
  title: 'Messaging/PresenceAvatar',
  component: PresenceAvatar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Circular avatar with an online/offline presence dot. Shows initials on an orange background when no profile image is provided.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PresenceAvatar>;

export const Online: Story = {
  args: {
    displayName: 'Simon James',
    profileImage: null,
    info: { status: 'online', lastSeen: null },
    size: 50,
    showDot: true,
  },
};

export const Offline: Story = {
  args: {
    displayName: 'Alice Brown',
    profileImage: null,
    info: { status: 'offline', lastSeen: new Date(Date.now() - 20 * 60 * 1000) },
    size: 50,
    showDot: true,
  },
};

export const Away: Story = {
  args: {
    displayName: 'Bob Smith',
    profileImage: null,
    info: { status: 'away', lastSeen: null },
    size: 50,
    showDot: true,
  },
};

export const WithImage: Story = {
  args: {
    displayName: 'Charlie Davis',
    profileImage: '/profile/default.jpg',
    info: { status: 'online', lastSeen: null },
    size: 50,
    showDot: true,
  },
};

export const Large: Story = {
  args: {
    displayName: 'Diana Prince',
    profileImage: null,
    info: { status: 'online', lastSeen: null },
    size: 80,
    showDot: true,
  },
};

export const Small: Story = {
  args: {
    displayName: 'Eve Adams',
    profileImage: null,
    info: { status: 'offline', lastSeen: new Date(Date.now() - 2 * 3600 * 1000) },
    size: 32,
    showDot: true,
  },
};

export const HiddenStatus: Story = {
  args: {
    displayName: 'Frank Hidden',
    profileImage: null,
    info: { status: 'offline', lastSeen: null, hidden: true },
    size: 50,
    showDot: false,
  },
};

export const NoDot: Story = {
  args: {
    displayName: 'Grace Note',
    profileImage: null,
    info: { status: 'online', lastSeen: null },
    size: 50,
    showDot: false,
  },
};

