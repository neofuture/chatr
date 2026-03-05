import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import RoutePreloader from './RoutePreloader';

const meta: Meta<typeof RoutePreloader> = {
  title: 'Utility/RoutePreloader',
  component: RoutePreloader,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Invisible utility component that prefetches all app routes on mount using Next.js router.prefetch(). Renders nothing visible — place it once inside AppLayout.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof RoutePreloader>;

export const Default: Story = {
  render: () => (
    <div style={{ padding: 24, color: '#94a3b8', fontFamily: 'monospace', fontSize: 14 }}>
      <RoutePreloader />
      <p>RoutePreloader renders nothing visible.</p>
      <p>On mount it calls <code>router.prefetch()</code> for all app routes.</p>
      <p>Check the browser console for the preload log.</p>
    </div>
  ),
};

