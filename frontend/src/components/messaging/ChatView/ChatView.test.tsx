import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import ChatView from './ChatView';
import type { Message } from '@/components/MessageBubble';

jest.mock('@/components/MessageBubble', () => ({
  __esModule: true,
  default: ({ messages }: { messages: any[] }) => (
    <div data-testid="message-bubble">
      {messages.map((m: any) => <div key={m.id}>{m.content}</div>)}
    </div>
  ),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

const baseMessage: Message = {
  id: '1',
  content: 'Hello world',
  senderId: 'user1',
  recipientId: 'user2',
  direction: 'sent',
  status: 'sent',
  timestamp: new Date('2026-01-01T12:00:00Z'),
  type: 'text',
};

function Wrapper(props: Partial<React.ComponentProps<typeof ChatView>>) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <ChatView
      messages={[baseMessage]}
      isDark={true}
      messagesEndRef={ref}
      isRecipientTyping={false}
      isRecipientRecording={false}
      recipientGhostText=""
      listeningMessageIds={new Set()}
      onImageClick={jest.fn()}
      onAudioPlayStatusChange={jest.fn()}
      {...props}
    />
  );
}

describe('ChatView', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<Wrapper />);
      expect(container).toBeInTheDocument();
    });

    it('renders messages via MessageBubble', () => {
      render(<Wrapper />);
      expect(screen.getByTestId('message-bubble')).toBeInTheDocument();
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    it('renders empty state with no messages', () => {
      const { container } = render(<Wrapper messages={[]} />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Header', () => {
    it('does not render header when showClearButton is false and queuedCount is 0', () => {
      render(<Wrapper showClearButton={false} queuedCount={0} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders clear button when showClearButton is true', () => {
      render(<Wrapper showClearButton={true} onClear={jest.fn()} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders queued badge when queuedCount > 0', () => {
      render(<Wrapper queuedCount={3} />);
      expect(screen.getByText(/3/)).toBeInTheDocument();
    });
  });

  describe('Multiple messages', () => {
    it('renders multiple messages', () => {
      const messages: Message[] = [
        { ...baseMessage, id: '1', content: 'First message' },
        { ...baseMessage, id: '2', content: 'Second message' },
      ];
      render(<Wrapper messages={messages} />);
      expect(screen.getByText('First message')).toBeInTheDocument();
      expect(screen.getByText('Second message')).toBeInTheDocument();
    });
  });
});

