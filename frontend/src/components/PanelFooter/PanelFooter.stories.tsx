import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import PanelFooter from './PanelFooter';
import Button from '@/components/form-controls/Button/Button';

const meta: Meta<typeof PanelFooter> = {
  title: 'Layout/PanelFooter',
  component: PanelFooter,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Footer bar for slide-in panels. Accepts any children — used to host MessageInput or action buttons.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: 300, display: 'flex', flexDirection: 'column', background: '#0f172a', position: 'relative' }}>
        <div style={{ flex: 1 }} />
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PanelFooter>;

export const WithButtons: Story = {
  args: {
    children: (
      <div style={{ display: 'flex', gap: 8, padding: '8px 16px' }}>
        <Button variant="ghost">Cancel</Button>
        <Button>Save</Button>
      </div>
    ),
  },
};

export const Empty: Story = {
  args: {
    children: null,
  },
};

export const WithText: Story = {
  args: {
    children: (
      <div style={{ padding: '12px 16px', color: '#94a3b8', fontSize: 14 }}>
        Panel footer content goes here
      </div>
    ),
  },
};

