import type { Meta, StoryObj } from '@storybook/react';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import WebSocketStatusBadge from './WebSocketStatusBadge';

const meta: Meta<typeof WebSocketStatusBadge> = {
  title: 'Utility/WebSocketStatusBadge',
  component: WebSocketStatusBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Draggable developer badge showing WebSocket connection status and a scrollable event log. Only visible when authenticated.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ThemeProvider>
        <WebSocketProvider>
          <Story />
        </WebSocketProvider>
      </ThemeProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', 'demo-token');
    }
    return (
      <div style={{ width: '100vw', height: '100vh', background: '#0f172a', position: 'relative' }}>
        <WebSocketStatusBadge />
        <div style={{ padding: '2rem', color: '#94a3b8' }}>Drag the badge around the screen</div>
      </div>
    );
  },
};

