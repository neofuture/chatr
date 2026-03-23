import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import SiteFooter from './SiteFooter';

const meta: Meta<typeof SiteFooter> = {
  title: 'Site/SiteFooter',
  component: SiteFooter,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Site-wide footer with links and copyright notice.' } },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof SiteFooter>;

export const Default: Story = {};
