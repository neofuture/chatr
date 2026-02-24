import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider } from '@/contexts/ToastContext';
import { WebSocketProvider } from '@/contexts/WebSocketContext';
import ToastContainer from '@/components/ToastContainer/ToastContainer';
import ChatInput from './ChatInput';

const meta: Meta<typeof ChatInput> = {
  title: 'Messaging/ChatInput',
  component: ChatInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Full-featured chat input with text, emoji picker, voice recording, and multi-file attachment support. Handles typing indicators and edit mode.',
      },
    },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <WebSocketProvider>
          <div
            data-theme="dark"
            style={{
              width: '100vw',
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              background: '#0f172a',
            }}
          >
            <div style={{ flex: 1, padding: '1.5rem', color: '#94a3b8' }}>
              <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                <h3 style={{ color: '#e2e8f0', marginBottom: '0.75rem' }}>Conversation</h3>
                <p style={{ opacity: 0.7 }}>
                  This area represents the message list. The input bar is anchored to the bottom like the real app.
                </p>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <Story />
              </div>
            </div>
          </div>
          <ToastContainer />
        </WebSocketProvider>
      </ToastProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { recipientId: 'demo-recipient-id' },
};
