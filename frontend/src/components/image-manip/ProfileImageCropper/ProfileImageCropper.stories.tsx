import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ProfileImageCropper from './ProfileImageCropper';

function makeTestImage(): File {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(200, 200, 40, 200, 200, 200);
  grad.addColorStop(0, '#f97316');
  grad.addColorStop(0.5, '#764ba2');
  grad.addColorStop(1, '#667eea');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 400);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Profile', 200, 210);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const bin = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], 'profile.jpg', { type: 'image/jpeg' });
}

const testImage = makeTestImage();

const meta: Meta<typeof ProfileImageCropper> = {
  title: 'Image/ProfileImageCropper',
  component: ProfileImageCropper,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Circular crop tool for profile photos. Supports drag-to-pan and zoom. Outputs a 400×400 JPG blob. Renders as a full-screen modal overlay.',
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
type Story = StoryObj<typeof ProfileImageCropper>;

export const Default: Story = {
  args: {
    imageFile: testImage,
    onCropComplete: fn(),
    onCancel: fn(),
    isDark: true,
  },
  parameters: { backgrounds: { default: 'dark' }, docs: { story: { inline: false, iframeHeight: 600 } } },
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
  parameters: { backgrounds: { default: 'light' }, docs: { story: { inline: false, iframeHeight: 600 } } },
  decorators: [
    (Story) => {
      document.body.style.backgroundColor = '#ffffff';
      return <Story />;
    },
  ],
};
