import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import LinkPreviewCard, { type LinkPreviewData } from './LinkPreviewCard';

const fullPreview: LinkPreviewData = {
  url: 'https://example.com/article',
  title: 'Understanding Modern Web Development',
  description: 'A comprehensive guide to building web applications with the latest tools and frameworks.',
  image: 'https://picsum.photos/seed/link-preview/600/300',
  siteName: 'Example Blog',
  favicon: 'https://www.google.com/favicon.ico',
};

const meta: Meta<typeof LinkPreviewCard> = {
  title: 'Messaging/LinkPreviewCard',
  component: LinkPreviewCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Card displaying Open Graph link preview data with optional dismiss button and compact mode.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof LinkPreviewCard>;

export const Default: Story = {
  args: { preview: fullPreview, onDismiss: fn() },
};

export const Compact: Story = {
  args: { preview: fullPreview, onDismiss: fn(), compact: true },
};

export const NoDismiss: Story = {
  args: { preview: fullPreview },
};

export const MinimalData: Story = {
  args: {
    preview: {
      url: 'https://example.com',
      title: 'Example Page',
      description: null,
      image: null,
      siteName: null,
      favicon: null,
    },
    onDismiss: fn(),
  },
};

export const NoImage: Story = {
  args: {
    preview: { ...fullPreview, image: null },
    onDismiss: fn(),
  },
};
