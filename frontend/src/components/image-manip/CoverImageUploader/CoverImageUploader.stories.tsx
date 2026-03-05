import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import CoverImageUploader from './CoverImageUploader';

const meta: Meta<typeof CoverImageUploader> = {
  title: 'Image/CoverImageUploader',
  component: CoverImageUploader,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Cover / banner image uploader with a 16:9 crop tool. Accepts JPG/PNG/WEBP up to 5 MB. Persists locally and uploads to the server.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <div style={{ width: 640, padding: 24, background: '#1e293b', borderRadius: 12 }}>
            <Story />
          </div>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CoverImageUploader>;

export const Dark: Story = {
  args: { userId: 'story-user-123', isDark: true },
};

export const Light: Story = {
  args: { userId: 'story-user-123', isDark: false },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <div style={{ width: 640, padding: 24, background: '#f1f5f9', borderRadius: 12 }}>
            <Story />
          </div>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

