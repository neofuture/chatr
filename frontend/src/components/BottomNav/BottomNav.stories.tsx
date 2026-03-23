import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import BottomNav from './BottomNav';

const meta: Meta<typeof BottomNav> = {
  title: 'Layout/BottomNav',
  component: BottomNav,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Mobile bottom navigation bar with Chats, Groups, and Settings tabs. Shows active route highlight, animated transitions, and profile avatar.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <WebSocketProvider>
          <div style={{ height: '100vh', background: '#0f172a', position: 'relative' }}>
            <div style={{ flex: 1 }} />
            <Story />
          </div>
        </WebSocketProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

export const Dark: Story = {};

export const Light: Story = {
  decorators: [
    (Story) => (
      <ThemeProvider>
        <WebSocketProvider>
          <div style={{ height: '100vh', background: '#f8fafc', position: 'relative' }}>
            <Story />
          </div>
        </WebSocketProvider>
      </ThemeProvider>
    ),
  ],
};

