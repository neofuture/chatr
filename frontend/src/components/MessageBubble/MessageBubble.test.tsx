import { render, screen } from '@testing-library/react';
import MessageBubble, { type Message } from './MessageBubble';
import { useRef } from 'react';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

jest.mock('@/components/MessageAudioPlayer/MessageAudioPlayer', () => ({
  __esModule: true,
  default: () => <div data-testid="audio-player">AudioPlayer</div>,
}));

jest.mock('./MessageBubble.module.css', () => ({}), { virtual: true });

const sentMsg: Message = {
  id: '1',
  content: 'Hello there',
  senderId: 'user1',
  recipientId: 'user2',
  direction: 'sent',
  status: 'sent',
  timestamp: new Date('2026-01-01T12:00:00Z'),
  type: 'text',
};

const receivedMsg: Message = {
  ...sentMsg,
  id: '2',
  content: 'Hey back',
  direction: 'received',
};

function Wrapper(props: Partial<React.ComponentProps<typeof MessageBubble>>) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <MessageBubble
      messages={[sentMsg]}
      messagesEndRef={ref}
      onImageClick={jest.fn()}
      onAudioPlayStatusChange={jest.fn()}
      listeningMessageIds={new Set()}
      {...props}
    />
  );
}

describe('MessageBubble', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const { container } = render(<Wrapper />);
      expect(container).toBeInTheDocument();
    });

    it('renders message content', () => {
      render(<Wrapper />);
      expect(screen.getByText('Hello there')).toBeInTheDocument();
    });

    it('renders multiple messages', () => {
      render(<Wrapper messages={[sentMsg, receivedMsg]} />);
      expect(screen.getByText('Hello there')).toBeInTheDocument();
      expect(screen.getByText('Hey back')).toBeInTheDocument();
    });

    it('renders empty list without crashing', () => {
      const { container } = render(<Wrapper messages={[]} />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Typing indicators', () => {
    it('renders more elements when isRecipientTyping is true', () => {
      const { container: withTyping } = render(<Wrapper isRecipientTyping={true} />);
      const { container: withoutTyping } = render(<Wrapper isRecipientTyping={false} />);
      // Typing indicator adds extra elements to the DOM
      expect(withTyping.children[0].children.length).toBeGreaterThan(
        withoutTyping.children[0].children.length,
      );
    });

    it('renders more elements when isRecipientRecording is true', () => {
      const { container: withRecording } = render(<Wrapper isRecipientRecording={true} />);
      const { container: withoutRecording } = render(<Wrapper isRecipientRecording={false} />);
      expect(withRecording.children[0].children.length).toBeGreaterThan(
        withoutRecording.children[0].children.length,
      );
    });

    it('shows ghost text when provided', () => {
      render(<Wrapper recipientGhostText="typing something..." />);
      expect(screen.getByText('typing something...')).toBeInTheDocument();
    });
  });

  describe('Message types', () => {
    it('renders audio player for audio messages', () => {
      const audioMsg: Message = {
        ...sentMsg,
        type: 'audio',
        fileUrl: '/audio/test.mp3',
        waveformData: [0.1, 0.5, 0.9],
        duration: 10,
      };
      render(<Wrapper messages={[audioMsg]} />);
      expect(screen.getByTestId('audio-player')).toBeInTheDocument();
    });

    it('renders image messages', () => {
      const imageMsg: Message = {
        ...sentMsg,
        type: 'image',
        fileUrl: '/images/test.jpg',
        fileName: 'test.jpg',
      };
      render(<Wrapper messages={[imageMsg]} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });
});

