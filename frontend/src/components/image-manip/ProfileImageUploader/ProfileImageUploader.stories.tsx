import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
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
          <div style={{ width: 420, padding: 24, background: '#1e293b', borderRadius: 12 }}>
            <Story />
          </div>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileImageUploader>;

export const Dark: Story = {
  args: { userId: 'story-user-123', isDark: true },
};

export const Light: Story = {
  args: { userId: 'story-user-123', isDark: false },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <div style={{ width: 420, padding: 24, background: '#f1f5f9', borderRadius: 12 }}>
            <Story />
          </div>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

