import { render, screen, fireEvent } from '@testing-library/react';
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

    it('renders file messages with open/download link', () => {
      const fileMsg: Message = {
        ...sentMsg,
        type: 'file',
        fileUrl: '/files/doc.pdf',
        fileName: 'doc.pdf',
        fileSize: 2048,
      };
      render(<Wrapper messages={[fileMsg]} />);
      // PDF is previewable → "Open doc.pdf", non-previewable would be "Download …"
      const link = screen.getByRole('link', { name: /doc\.pdf/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/files/doc.pdf');
    });

    it('non-previewable file has download attribute', () => {
      const fileMsg: Message = {
        ...sentMsg,
        type: 'file',
        fileUrl: '/files/archive.zip',
        fileName: 'archive.zip',
        fileSize: 102400,
        fileType: 'application/zip',
      };
      render(<Wrapper messages={[fileMsg]} />);
      const link = screen.getByRole('link', { name: /archive\.zip/i });
      expect(link).toHaveAttribute('download');
    });

    it('PDF file does not have download attribute (opens inline)', () => {
      const fileMsg: Message = {
        ...sentMsg,
        type: 'file',
        fileUrl: '/files/report.pdf',
        fileName: 'report.pdf',
        fileType: 'application/pdf',
      };
      render(<Wrapper messages={[fileMsg]} />);
      const link = screen.getByRole('link', { name: /open report\.pdf/i });
      expect(link).not.toHaveAttribute('download');
    });

    it('video file does not have download attribute', () => {
      const fileMsg: Message = {
        ...sentMsg,
        type: 'file',
        fileUrl: '/files/clip.mp4',
        fileName: 'clip.mp4',
        fileType: 'video/mp4',
      };
      render(<Wrapper messages={[fileMsg]} />);
      const link = screen.getByRole('link', { name: /open clip\.mp4/i });
      expect(link).not.toHaveAttribute('download');
    });

    it('renders unsent placeholder', () => {
      const unsentMsg: Message = { ...sentMsg, unsent: true };
      render(<Wrapper messages={[unsentMsg]} />);
      expect(screen.getByText(/you unsent this message/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('each message has role="article"', () => {
      render(<Wrapper messages={[sentMsg, receivedMsg]} />);
      const articles = screen.getAllByRole('article');
      expect(articles.length).toBe(2);
    });

    it('message article has descriptive aria-label with content', () => {
      render(<Wrapper />);
      const article = screen.getByRole('article');
      const label = article.getAttribute('aria-label') ?? '';
      expect(label).toMatch(/hello there/i);
    });

    it('message article aria-label includes sender name for sent messages', () => {
      render(<Wrapper />);
      const article = screen.getByRole('article');
      const label = article.getAttribute('aria-label') ?? '';
      expect(label).toMatch(/you/i);
    });

    it('received message article aria-label includes sender name', () => {
      const recvWithName: Message = { ...receivedMsg, senderDisplayName: 'Alice' };
      render(<Wrapper messages={[recvWithName]} />);
      const articles = screen.getAllByRole('article');
      const receivedArticle = articles.find(a =>
        /alice/i.test(a.getAttribute('aria-label') ?? ''),
      );
      expect(receivedArticle).toBeInTheDocument();
    });

    it('message bubble has tabIndex=0', () => {
      render(<Wrapper />);
      const article = screen.getByRole('article');
      const focusable = article.querySelector('[tabindex="0"]');
      expect(focusable).toBeInTheDocument();
    });

    it('avatar column is aria-hidden', () => {
      render(<Wrapper messages={[receivedMsg]} />);
      const article = screen.getAllByRole('article')[0];
      const avatarCol = article.querySelector('[aria-hidden="true"]');
      expect(avatarCol).toBeInTheDocument();
    });

    it('typing indicator is aria-hidden', () => {
      render(<Wrapper isRecipientTyping={true} />);
      // The typing wrapper should be aria-hidden since the live region handles SR
      const hiddenEl = document.querySelector('[aria-hidden="true"]');
      expect(hiddenEl).toBeInTheDocument();
    });

    it('recording indicator is aria-hidden', () => {
      render(<Wrapper isRecipientRecording={true} />);
      const hiddenEl = document.querySelector('[aria-hidden="true"]');
      expect(hiddenEl).toBeInTheDocument();
    });

    it('image message has descriptive alt text', () => {
      const imageMsg: Message = {
        ...sentMsg,
        type: 'image',
        fileUrl: '/images/test.jpg',
        fileName: 'photo.jpg',
      };
      render(<Wrapper messages={[imageMsg]} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'photo.jpg');
    });

    it('image with no fileName falls back to "Shared image" alt', () => {
      const imageMsg: Message = {
        ...sentMsg,
        type: 'image',
        fileUrl: '/images/test.jpg',
      };
      render(<Wrapper messages={[imageMsg]} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('alt', 'Shared image');
    });
  });

  describe('Keyboard interactions', () => {
    it('pressing Enter on a bubble calls openMenu (renders context menu)', () => {
      render(<Wrapper currentUserId="user1" onReaction={jest.fn()} onReply={jest.fn()} onUnsend={jest.fn()} />);
      const article = screen.getByRole('article');
      const bubble = article.querySelector('[tabindex="0"]') as HTMLElement;
      fireEvent.keyDown(bubble, { key: 'Enter' });
      // Context menu should appear
      expect(screen.getByRole('dialog', { name: /message actions/i })).toBeInTheDocument();
    });

    it('pressing Space on a bubble opens the context menu', () => {
      render(<Wrapper currentUserId="user1" onReaction={jest.fn()} onReply={jest.fn()} onUnsend={jest.fn()} />);
      const article = screen.getByRole('article');
      const bubble = article.querySelector('[tabindex="0"]') as HTMLElement;
      fireEvent.keyDown(bubble, { key: ' ' });
      expect(screen.getByRole('dialog', { name: /message actions/i })).toBeInTheDocument();
    });
  });

  describe('Reactions', () => {
    it('renders reaction badge when message has reactions', () => {
      const msgWithReaction: Message = {
        ...sentMsg,
        reactions: [{ userId: 'user1', username: 'alice', emoji: '❤️' }],
      };
      render(<Wrapper messages={[msgWithReaction]} currentUserId="user1" />);
      // ReactionBadge renders the emoji
      expect(screen.getByText('❤️')).toBeInTheDocument();
    });

    it('reaction badge has role="button" and aria-label', () => {
      const msgWithReaction: Message = {
        ...sentMsg,
        reactions: [{ userId: 'user2', username: 'bob', emoji: '😂' }],
      };
      render(<Wrapper messages={[msgWithReaction]} currentUserId="user1" />);
      const badge = screen.getByRole('button', { name: /reactions:/i });
      expect(badge).toBeInTheDocument();
    });

    it('reaction badge is keyboard accessible', () => {
      const msgWithReaction: Message = {
        ...sentMsg,
        reactions: [{ userId: 'user1', username: 'alice', emoji: '👍' }],
      };
      render(<Wrapper messages={[msgWithReaction]} currentUserId="user1" />);
      const badge = screen.getByRole('button', { name: /reactions:/i });
      expect(badge).toHaveAttribute('tabindex', '0');
    });

    it('pressing Enter on reaction badge toggles tooltip', () => {
      const msgWithReaction: Message = {
        ...sentMsg,
        reactions: [{ userId: 'user1', username: 'alice', emoji: '❤️' }],
      };
      render(<Wrapper messages={[msgWithReaction]} currentUserId="user1" />);
      const badge = screen.getByRole('button', { name: /reactions:/i });
      fireEvent.keyDown(badge, { key: 'Enter' });
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  describe('Reply quote', () => {
    it('renders reply quote above the bubble', () => {
      const msgWithReply: Message = {
        ...sentMsg,
        replyTo: {
          id: '0',
          content: 'Original message',
          senderUsername: 'bob',
        },
      };
      render(<Wrapper messages={[msgWithReply]} />);
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });
  });
});

