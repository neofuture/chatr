import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AuthPanel from './AuthPanel';

const meta: Meta<typeof AuthPanel> = {
  title: 'Panels/AuthPanel',
  component: AuthPanel,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Slide-in authentication panel hosting login and register flows. Switches between views with an animated transition. Opens sub-panels for forgot password and email verification.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <PanelProvider>
            <div style={{ height: '100vh', background: '#0f172a' }}>
              <Story />
            </div>
          </PanelProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AuthPanel>;

export const Login: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close'),
    initialView: 'login',
  },
};

export const Register: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Close'),
    initialView: 'register',
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    initialView: 'login',
  },
};

