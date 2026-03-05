import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ForgotPasswordContent } from './ForgotPassword';

const meta: Meta<typeof ForgotPasswordContent> = {
  title: 'Forms/ForgotPassword',
  component: ForgotPasswordContent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Forgot password form. User enters their email address to receive a password reset OTP.',
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
type Story = StoryObj<typeof ForgotPasswordContent>;

export const Default: Story = {};

