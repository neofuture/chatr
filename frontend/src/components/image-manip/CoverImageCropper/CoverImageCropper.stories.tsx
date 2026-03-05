import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import CoverImageCropper from './CoverImageCropper';

function makeTestFile(name = 'cover.jpg', type = 'image/jpeg'): File {
  const blob = new Blob(['fake-image-data'], { type });
  return new File([blob], name, { type });
}

const meta: Meta<typeof CoverImageCropper> = {
  title: 'Image/CoverImageCropper',
  component: CoverImageCropper,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Rectangular 16:9 crop tool for cover/banner images. Supports drag-to-pan and zoom. Outputs a 1200×630 JPG blob.',
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
type Story = StoryObj<typeof CoverImageCropper>;

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

