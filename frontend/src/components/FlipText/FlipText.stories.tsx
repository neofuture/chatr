import React, { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import FlipText from './FlipText';

const meta: Meta<typeof FlipText> = {
  title: 'Utility/FlipText',
  component: FlipText,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Animates a text value change with a vertical flip/scroll transition. Used in the conversation list to flip between the last message and online status.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof FlipText>;

export const Static: Story = {
  args: {
    value: 'Hello, World!',
  },
};

function AutoFlipStory() {
  const values = ['Online', 'You: Hey there 👋', 'Last seen 5 mins ago', 'You: Looking good!'];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % values.length), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ width: 220 }}>
      <FlipText value={values[idx]} />
    </div>
  );
}

export const AutoFlipping: Story = {
  render: () => <AutoFlipStory />,
  parameters: {
    docs: { description: { story: 'Automatically cycles through values every 2 seconds to demonstrate the flip animation.' } },
  },
};

function PresenceFlipStory() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setIsOnline(v => !v), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 200 }}>
        <FlipText value={isOnline ? 'Online' : 'Last seen 2 mins ago'} />
      </div>
      <p style={{ fontSize: 12, color: '#888' }}>Flips every 3 seconds</p>
    </div>
  );
}

export const PresenceFlip: Story = {
  render: () => <PresenceFlipStory />,
  parameters: {
    docs: { description: { story: 'Demonstrates how FlipText is used to alternate between online status and last message.' } },
  },
};

