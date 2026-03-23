import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import CoverImageCropper from './CoverImageCropper';

function makeTestImage(): File {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 800, 400);
  grad.addColorStop(0, '#667eea');
  grad.addColorStop(0.5, '#764ba2');
  grad.addColorStop(1, '#f97316');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 800, 400);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Cover Preview', 400, 220);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], 'cover.jpg', { type: 'image/jpeg' });
}

const testImage = makeTestImage();

const meta: Meta<typeof CoverImageCropper> = {
  title: 'Image/CoverImageCropper',
  component: CoverImageCropper,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Rectangular 16:9 crop tool for cover/banner images. Supports drag-to-pan and zoom. Outputs a 1200×630 JPG blob. Renders as a full-screen modal overlay.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <Story />
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CoverImageCropper>;

export const Default: Story = {
  args: {
    imageFile: testImage,
    onCropComplete: fn(),
    onCancel: fn(),
    isDark: true,
  },
  parameters: { backgrounds: { default: 'dark' }, docs: { story: { inline: false, iframeHeight: 550 } } },
  decorators: [
    (Story) => {
      document.body.style.backgroundColor = '#0f172a';
      return <Story />;
    },
  ],
};

export const LightTheme: Story = {
  args: {
    imageFile: testImage,
    onCropComplete: fn(),
    onCancel: fn(),
    isDark: false,
  },
  parameters: { backgrounds: { default: 'light' }, docs: { story: { inline: false, iframeHeight: 550 } } },
  decorators: [
    (Story) => {
      document.body.style.backgroundColor = '#ffffff';
      return <Story />;
    },
  ],
};
