import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LogProvider } from '@/contexts/LogContext';
import LogViewerPanel from './LogViewerPanel';

const meta: Meta<typeof LogViewerPanel> = {
  title: 'Utility/LogViewerPanel',
  component: LogViewerPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Real-time WebSocket event log viewer. Displays sent/received/info/error events, supports copy-to-clipboard and clear. Opened from Settings.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <LogProvider>
          <div style={{ height: 500, background: '#0f172a' }}>
            <Story />
          </div>
        </LogProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LogViewerPanel>;

export const Default: Story = {};

