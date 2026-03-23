import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import ProfileImageUploader from './ProfileImageUploader';

const meta: Meta<typeof ProfileImageUploader> = {
  title: 'Image/ProfileImageUploader',
  component: ProfileImageUploader,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Profile image uploader with built-in crop/zoom tool. Accepts JPG/PNG/WEBP up to 5 MB. Persists locally and uploads to the server.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <WebSocketProvider>
            <Story />
          </WebSocketProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileImageUploader>;

export const Dark: Story = {
  args: { userId: 'story-user-123', isDark: true },
  decorators: [
    (Story) => (
      <div style={{ width: 420, padding: 24, background: '#0f172a', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
};

export const Light: Story = {
  args: { userId: 'story-user-123', isDark: false },
  decorators: [
    (Story) => (
      <div style={{ width: 420, padding: 24, background: '#ffffff', borderRadius: 12 }}>
        <Story />
      </div>
    ),
  ],
};
