import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import BottomSheetDemo from './BottomSheetDemo';

const meta: Meta<typeof BottomSheetDemo> = {
  title: 'Demos/BottomSheetDemo',
  component: BottomSheetDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Interactive demo of all BottomSheet variants — full-height, fixed-height, auto-height, and no-close-button. Also demonstrates form controls rendered inside a BottomSheet.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <div style={{ minHeight: '100vh', background: '#0f172a', padding: 24 }}>
            <Story />
          </div>
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BottomSheetDemo>;

export const Default: Story = {};

