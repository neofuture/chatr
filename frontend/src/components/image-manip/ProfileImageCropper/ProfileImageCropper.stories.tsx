import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ProfileImageCropper from './ProfileImageCropper';

// Create a small test image file for stories
function makeTestFile(name = 'test.jpg', type = 'image/jpeg'): File {
  const blob = new Blob(['fake-image-data'], { type });
  return new File([blob], name, { type });
}

const meta: Meta<typeof ProfileImageCropper> = {
  title: 'Image/ProfileImageCropper',
  component: ProfileImageCropper,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Circular crop tool for profile photos. Supports drag-to-pan and zoom. Outputs a 400×400 JPG blob.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <div style={{ background: '#0f172a', padding: 24, borderRadius: 12 }}>
            <Story />
          </div>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ProfileImageCropper>;

export const Default: Story = {
  args: {
    imageFile: makeTestFile(),
    onCropComplete: (file) => console.log('Cropped:', file.name, file.size),
    onCancel: () => console.log('Cancelled'),
    isDark: true,
  },
};

export const LightTheme: Story = {
  args: {
    imageFile: makeTestFile(),
    onCropComplete: (file) => console.log('Cropped:', file.name, file.size),
    onCancel: () => console.log('Cancelled'),
    isDark: false,
  },
};

