import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { Demo2FAContent } from './Demo2FA';

const meta: Meta<typeof Demo2FAContent> = {
  title: 'Forms/Demo2FA',
  component: Demo2FAContent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Interactive 2FA / OTP code entry demo. Enter code `123456` to see a success response. Used to demonstrate and test the 6-digit code input behaviour.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <div style={{ width: 420 }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Demo2FAContent>;

export const Default: Story = {};

