import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import PresenceLabel from './PresenceLabel';

const meta: Meta<typeof PresenceLabel> = {
  title: 'Messaging/PresenceLabel',
  component: PresenceLabel,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Text label showing a user\'s online status or last seen time. Supports an optional coloured dot. Formats last-seen intelligently: seconds, minutes, hours, or date/time.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof PresenceLabel>;

export const Online: Story = {
  args: {
    info: { status: 'online', lastSeen: null },
    showDot: true,
    dotSize: 'sm',
  },
};

export const Away: Story = {
  args: {
    info: { status: 'away', lastSeen: null },
    showDot: true,
    dotSize: 'sm',
  },
};

export const LastSeenMinutesAgo: Story = {
  args: {
    info: { status: 'offline', lastSeen: new Date(Date.now() - 15 * 60 * 1000) },
    showDot: true,
    dotSize: 'sm',
  },
};

export const LastSeenHoursAgo: Story = {
  args: {
    info: { status: 'offline', lastSeen: new Date(Date.now() - 2 * 3600 * 1000) },
    showDot: true,
    dotSize: 'sm',
  },
};

export const LastSeenYesterday: Story = {
  args: {
    info: { status: 'offline', lastSeen: new Date(Date.now() - 25 * 3600 * 1000) },
    showDot: true,
    dotSize: 'sm',
  },
};

export const NoDot: Story = {
  args: {
    info: { status: 'online', lastSeen: null },
    showDot: false,
    dotSize: 'sm',
  },
};

export const LargeDot: Story = {
  args: {
    info: { status: 'online', lastSeen: null },
    showDot: true,
    dotSize: 'md',
  },
};

export const Hidden: Story = {
  name: 'Hidden Status (blank)',
  args: {
    info: { status: 'offline', lastSeen: null, hidden: true },
    showDot: false,
    dotSize: 'sm',
  },
};

