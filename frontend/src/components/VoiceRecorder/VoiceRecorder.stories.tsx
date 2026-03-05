import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import VoiceRecorder from './VoiceRecorder';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const meta: Meta<typeof VoiceRecorder> = {
  title: 'Messaging/VoiceRecorder',
  component: VoiceRecorder,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'In-browser voice recorder with live waveform visualisation. Requires microphone permission. Opens a modal UI for recording.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <ToastProvider>
          <Story />
        </ToastProvider>
      </ThemeProvider>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof VoiceRecorder>;

export const Default: Story = {
  args: {
    onRecordingComplete: (blob, waveform) => {
      console.log('Recording complete', blob.size, 'bytes,', waveform.length, 'samples');
    },
    disabled: false,
    compact: false,
  },
};

export const Compact: Story = {
  args: {
    onRecordingComplete: (blob, waveform) => {
      console.log('Recording complete', blob.size, 'bytes');
    },
    disabled: false,
    compact: true,
  },
};

export const Disabled: Story = {
  args: {
    onRecordingComplete: () => {},
    disabled: true,
    compact: false,
  },
};

export const CompactDisabled: Story = {
  args: {
    onRecordingComplete: () => {},
    disabled: true,
    compact: true,
  },
};

