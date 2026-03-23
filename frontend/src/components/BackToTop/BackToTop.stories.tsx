import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import BackToTop from './BackToTop';

const meta: Meta<typeof BackToTop> = {
  title: 'UI/BackToTop',
  component: BackToTop,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Floating button that scrolls the page to the top when clicked. Appears after scrolling down.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BackToTop>;

export const Default: Story = {
  render: () => (
    <div style={{ height: 2000, background: 'linear-gradient(to bottom, #0f172a, #1e293b)', padding: 24 }}>
      <p style={{ color: '#94a3b8' }}>Scroll down to see the Back to Top button appear.</p>
      <BackToTop />
    </div>
  ),
};
