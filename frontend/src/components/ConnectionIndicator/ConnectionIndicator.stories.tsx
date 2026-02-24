import type { Meta, StoryObj } from '@storybook/react';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import ConnectionIndicator from './ConnectionIndicator';

const meta: Meta<typeof ConnectionIndicator> = {
  title: 'Utility/ConnectionIndicator',
  component: ConnectionIndicator,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Banner shown when the WebSocket is disconnected or re-connecting. Hidden when connected.',
      },
    },
  },
  decorators: [
    (Story) => (
      <WebSocketProvider>
        <Story />
      </WebSocketProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

