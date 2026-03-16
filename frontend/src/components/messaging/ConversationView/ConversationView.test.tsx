import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConversationView from './ConversationView';

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: mockSocket, connected: true }),
}));

const mockOpenPanel = jest.fn();
const mockClosePanel = jest.fn();
jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({ openPanel: mockOpenPanel, closePanel: mockClosePanel }),
}));

const mockBlockUser = jest.fn();
const mockUnblockUser = jest.fn();
jest.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ blockUser: mockBlockUser, unblockUser: mockUnblockUser }),
}));

const mockShowConfirmation = jest.fn();
jest.mock('@/contexts/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: mockShowConfirmation }),
}));

const mockOpenUserProfile = jest.fn();
jest.mock('@/hooks/useOpenUserProfile', () => ({
  useOpenUserProfile: () => mockOpenUserProfile,
}));

jest.mock('@/lib/aiBot', () => ({
  isAIBot: () => false,
}));

jest.mock('@/lib/messageCache', () => ({
  clearCachedConversation: jest.fn(),
}));

const mockAddMessage = jest.fn();
const mockUseConversationView = {
  messages: [],
  messagesEndRef: { current: null },
  activeAudioMessageId: null,
  listeningMessageIds: new Set<string>(),
  isRecipientTyping: false,
  isRecipientRecording: false,
  lightboxUrl: null,
  lightboxName: '',
  replyingTo: null,
  editingMessage: null,
  addMessage: mockAddMessage,
  handleEditSaved: jest.fn(),
  editLastSentMessage: jest.fn(),
  handleAudioPlayStatusChange: jest.fn(),
  handleReaction: jest.fn(),
  handleUnsend: jest.fn(),
  openLightbox: jest.fn(),
  closeLightbox: jest.fn(),
  cancelReply: jest.fn(),
  cancelEdit: jest.fn(),
  setReplyingTo: jest.fn(),
  setEditingMessage: jest.fn(),
};

jest.mock('@/hooks/useConversationView', () => ({
  useConversationView: () => mockUseConversationView,
}));

jest.mock('@/components/messaging/ChatView', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="chat-view">
      {props.messages.length} messages
      {props.isRecipientTyping && <span>typing...</span>}
    </div>
  ),
}));

jest.mock('@/components/messaging/MessageInput/MessageInput', () => ({
  __esModule: true,
  default: (props: any) => <div data-testid="message-input">MessageInput</div>,
}));

jest.mock('@/components/Lightbox/Lightbox', () => ({
  __esModule: true,
  default: ({ imageUrl, onClose }: any) => (
    <div data-testid="lightbox" onClick={onClose}>{imageUrl}</div>
  ),
}));

jest.mock('@/components/settings/BlockedUsersPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="blocked-users-panel" />,
}));

jest.mock('@/lib/socketRPC', () => ({
  socketFirst: jest.fn(),
}));

describe('ConversationView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('user', JSON.stringify({ id: 'current-user' }));
    mockUseConversationView.messages = [];
    mockUseConversationView.lightboxUrl = null;
    mockUseConversationView.isRecipientTyping = false;
    mockUseConversationView.replyingTo = null;
    mockUseConversationView.editingMessage = null;
  });

  const defaultProps = {
    recipientId: 'recipient-1',
    isDark: true,
  };

  it('renders without crashing', () => {
    render(<ConversationView {...defaultProps} />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });

  it('renders empty state when no recipientId', () => {
    render(<ConversationView recipientId="" isDark={true} />);
    expect(screen.getByText('Select a conversation to start messaging')).toBeInTheDocument();
  });

  it('renders ChatView and MessageInput', () => {
    render(<ConversationView {...defaultProps} />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('shows message count from hook', () => {
    mockUseConversationView.messages = [
      { id: '1', content: 'Hello', direction: 'sent' },
      { id: '2', content: 'Hi', direction: 'received' },
    ] as any;
    render(<ConversationView {...defaultProps} />);
    expect(screen.getByText('2 messages')).toBeInTheDocument();
  });

  it('shows lightbox when lightboxUrl is set', () => {
    (mockUseConversationView as any).lightboxUrl = 'https://example.com/img.jpg';
    mockUseConversationView.lightboxName = 'test.jpg';
    render(<ConversationView {...defaultProps} />);
    expect(screen.getByTestId('lightbox')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/img.jpg')).toBeInTheDocument();
  });

  it('does not show lightbox when lightboxUrl is null', () => {
    render(<ConversationView {...defaultProps} />);
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
  });

  it('shows accept/decline bar for incoming pending request', () => {
    render(
      <ConversationView
        {...defaultProps}
        conversationId="conv-1"
        conversationStatus="pending"
        isInitiator={false}
      />
    );
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Deny')).toBeInTheDocument();
    expect(screen.getByText('Block')).toBeInTheDocument();
  });

  it('does not show accept/decline bar for outgoing pending request', () => {
    render(
      <ConversationView
        {...defaultProps}
        conversationId="conv-1"
        conversationStatus="pending"
        isInitiator={true}
      />
    );
    expect(screen.queryByText('Accept')).not.toBeInTheDocument();
    expect(screen.queryByText('Deny')).not.toBeInTheDocument();
  });

  it('does not show accept/decline bar for accepted conversation', () => {
    render(
      <ConversationView
        {...defaultProps}
        conversationId="conv-1"
        conversationStatus="accepted"
        isInitiator={false}
      />
    );
    expect(screen.queryByText('Accept')).not.toBeInTheDocument();
  });

  it('shows blocked footer when user is blocked by me', () => {
    render(
      <ConversationView
        {...defaultProps}
        isBlocked={true}
        blockedByMe={true}
        conversationStatus="accepted"
      />
    );
    expect(screen.getByText('You have blocked this user')).toBeInTheDocument();
    expect(screen.getByText('Manage in Settings')).toBeInTheDocument();
  });

  it('hides message input when user is blocked by me (accepted)', () => {
    render(
      <ConversationView
        {...defaultProps}
        isBlocked={true}
        blockedByMe={true}
        conversationStatus="accepted"
      />
    );
    expect(screen.queryByTestId('message-input')).not.toBeInTheDocument();
  });

  it('shows message input when not blocked', () => {
    render(<ConversationView {...defaultProps} />);
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('shows "Unblock & Accept" when blocked and incoming request', () => {
    render(
      <ConversationView
        {...defaultProps}
        conversationId="conv-1"
        conversationStatus="pending"
        isInitiator={false}
        blockedByMe={true}
      />
    );
    expect(screen.getByText('Unblock & Accept')).toBeInTheDocument();
    expect(screen.getByText('Unblock')).toBeInTheDocument();
  });

  it('registers socket listeners on mount', () => {
    render(<ConversationView {...defaultProps} />);
    const eventNames = mockSocket.on.mock.calls.map((c: any) => c[0]);
    expect(eventNames).toContain('message:sent');
    expect(eventNames).toContain('message:received');
    expect(eventNames).toContain('message:blocked');
  });

  it('cleans up socket listeners on unmount', () => {
    const { unmount } = render(<ConversationView {...defaultProps} />);
    unmount();
    expect(mockSocket.off).toHaveBeenCalled();
  });

  it('sets nukeRef callback', () => {
    const nukeRef = { current: null } as any;
    render(<ConversationView {...defaultProps} nukeRef={nukeRef} />);
    expect(nukeRef.current).toBeInstanceOf(Function);
  });

  it('clears nukeRef on unmount', () => {
    const nukeRef = { current: null } as any;
    const { unmount } = render(<ConversationView {...defaultProps} nukeRef={nukeRef} />);
    expect(nukeRef.current).toBeInstanceOf(Function);
    unmount();
    expect(nukeRef.current).toBeNull();
  });

  it('shows blocking text in accept bar when blocking', async () => {
    const user = userEvent.setup();
    mockShowConfirmation.mockResolvedValue(true);
    mockBlockUser.mockResolvedValue(undefined);
    render(
      <ConversationView
        {...defaultProps}
        conversationId="conv-1"
        conversationStatus="pending"
        isInitiator={false}
      />
    );
    await user.click(screen.getByText('Block'));
    expect(mockShowConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Block this user?' }),
    );
  });

  it('renders with isGuest prop', () => {
    render(<ConversationView {...defaultProps} isGuest={true} />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });
});
