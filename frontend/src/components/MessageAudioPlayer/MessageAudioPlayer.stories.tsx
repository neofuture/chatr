import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import MessageAudioPlayer from './MessageAudioPlayer';

const meta: Meta<typeof MessageAudioPlayer> = {
  title: 'Messaging/MessageAudioPlayer',
  component: MessageAudioPlayer,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Waveform audio player for voice messages. Renders a bar-graph waveform with play/pause and scrubbing support.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MessageAudioPlayer>;

// Generate a sample waveform
const sampleWaveform = Array.from({ length: 60 }, (_, i) =>
  Math.abs(Math.sin(i * 0.3) * 0.7 + Math.sin(i * 0.7) * 0.3)
);

export const Sent: Story = {
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 12,
    waveformData: sampleWaveform,
    isSent: true,
    timestamp: new Date(),
    messageId: 'story-1',
  },
};

export const Received: Story = {
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 8,
    waveformData: sampleWaveform,
    isSent: false,
    timestamp: new Date(),
    messageId: 'story-2',
  },
};

export const LongRecording: Story = {
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 94,
    waveformData: Array.from({ length: 120 }, (_, i) =>
      Math.abs(Math.sin(i * 0.15) * 0.9 + Math.random() * 0.1)
    ),
    isSent: true,
    timestamp: new Date(),
    messageId: 'story-3',
  },
};

export const WithStatus: Story = {
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 6,
    waveformData: Array.from({ length: 30 }, () => Math.random() * 0.8 + 0.1),
    isSent: true,
    status: 'delivered',
    timestamp: new Date(),
    messageId: 'story-4',
  },
};

export const RecipientListening: Story = {
  args: {
    audioUrl: '/audio/sample.mp3',
    duration: 10,
    waveformData: sampleWaveform,
    isSent: true,
    isListening: true,
    status: 'delivered',
    timestamp: new Date(),
    messageId: 'story-5',
  },
};
