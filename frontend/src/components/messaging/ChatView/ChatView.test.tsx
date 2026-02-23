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

  describe('Accessibility', () => {
    it('message list has role="log"', () => {
      render(<Wrapper />);
      expect(screen.getByRole('log')).toBeInTheDocument();
    });

    it('message list has aria-label="Messages"', () => {
      render(<Wrapper />);
      expect(screen.getByRole('log', { name: /messages/i })).toBeInTheDocument();
    });

    it('message list has aria-live="polite"', () => {
      render(<Wrapper />);
      const log = screen.getByRole('log');
      expect(log).toHaveAttribute('aria-live', 'polite');
    });

    it('message list is aria-busy when recipient is typing', () => {
      render(<Wrapper isRecipientTyping={true} />);
      const log = screen.getByRole('log');
      expect(log).toHaveAttribute('aria-busy', 'true');
    });

    it('message list is aria-busy when recipient is recording', () => {
      render(<Wrapper isRecipientRecording={true} />);
      const log = screen.getByRole('log');
      expect(log).toHaveAttribute('aria-busy', 'true');
    });

    it('message list is not aria-busy when idle', () => {
      render(<Wrapper isRecipientTyping={false} isRecipientRecording={false} />);
      const log = screen.getByRole('log');
      expect(log).toHaveAttribute('aria-busy', 'false');
    });

    it('renders a live status region', () => {
      render(<Wrapper />);
      const region = document.querySelector('[role="status"][aria-live="polite"]');
      expect(region).toBeInTheDocument();
    });

    it('live region announces typing status', () => {
      render(<Wrapper isRecipientTyping={true} />);
      const region = document.querySelector('[role="status"][aria-live="polite"]');
      expect(region?.textContent).toMatch(/typing/i);
    });

    it('live region announces recording status', () => {
      render(<Wrapper isRecipientRecording={true} />);
      const region = document.querySelector('[role="status"][aria-live="polite"]');
      expect(region?.textContent).toMatch(/recording/i);
    });

    it('live region is empty when idle', () => {
      render(<Wrapper isRecipientTyping={false} isRecipientRecording={false} recipientGhostText="" />);
      const region = document.querySelector('[role="status"][aria-live="polite"]');
      expect(region?.textContent).toBe('');
    });

    it('empty state has accessible role', () => {
      render(<Wrapper messages={[]} />);
      expect(screen.getByRole('status', { name: /no messages yet/i })).toBeInTheDocument();
    });

    it('clear button has aria-label', () => {
      render(<Wrapper showClearButton={true} onClear={jest.fn()} />);
      expect(screen.getByRole('button', { name: /clear all messages/i })).toBeInTheDocument();
    });

    it('header toolbar has aria-label', () => {
      render(<Wrapper showClearButton={true} onClear={jest.fn()} />);
      expect(screen.getByRole('toolbar', { name: /conversation controls/i })).toBeInTheDocument();
    });

    it('overlay is aria-hidden', () => {
      const { container } = render(<Wrapper />);
      // The overlay div should be aria-hidden
      const overlay = container.querySelector('[aria-hidden="true"]');
      expect(overlay).toBeInTheDocument();
    });
  });
});

