import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import SiteNav from './SiteNav';

const meta: Meta<typeof SiteNav> = {
  title: 'Site/SiteNav',
  component: SiteNav,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Top navigation bar with logo, links, theme toggle, and auth controls.' } },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SiteNav>;

export const Default: Story = {};
