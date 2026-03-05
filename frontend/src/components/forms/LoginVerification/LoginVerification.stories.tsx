import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LoginVerificationContent } from './LoginVerification';

const meta: Meta<typeof LoginVerificationContent> = {
  title: 'Forms/LoginVerification',
  component: LoginVerificationContent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'OTP verification step after login. User enters the 6-digit code sent to their email or phone.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <PanelProvider>
            <div style={{ width: 420 }}>
              <Story />
            </div>
          </PanelProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LoginVerificationContent>;

export const Default: Story = {
  args: {
    userId: 'story-user-id',
    email: 'user@example.com',
    password: 'Password1!',
  },
};

