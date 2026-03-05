import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { EmailVerificationContent } from './EmailVerification';

const meta: Meta<typeof EmailVerificationContent> = {
  title: 'Forms/EmailVerification',
  component: EmailVerificationContent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Email/phone OTP verification form used during registration and login. Supports email, login, and phone verification types.',
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
type Story = StoryObj<typeof EmailVerificationContent>;

export const EmailVerification: Story = {
  args: {
    userId: 'story-user-id',
    email: 'user@example.com',
    verificationType: 'email',
  },
};

export const LoginVerification: Story = {
  args: {
    userId: 'story-user-id',
    email: 'user@example.com',
    verificationType: 'login',
  },
};

export const PhoneVerification: Story = {
  args: {
    userId: 'story-user-id',
    verificationType: 'phone',
  },
};

