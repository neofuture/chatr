import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import MyProfilePanel from './MyProfilePanel';

const meta: Meta<typeof MyProfilePanel> = {
  title: 'Settings/MyProfilePanel',
  component: MyProfilePanel,
  parameters: {
    layout: 'fullscreen',
    docs: { description: { component: 'Editable profile panel for display name, bio, gender, and phone number.' } },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <WebSocketProvider>
          <div style={{ width: 380, height: 700, background: '#0f172a' }}>
            <Story />
          </div>
        </WebSocketProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MyProfilePanel>;

export const Default: Story = {};
