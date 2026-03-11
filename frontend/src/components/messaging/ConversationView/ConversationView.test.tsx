import { render, screen } from '@testing-library/react';
import ConversationView from './ConversationView';

jest.mock('@/hooks/useConversationView', () => ({
  useConversationView: () => ({
    messages: [],
    messagesEndRef: { current: null },
    activeAudioMessageId: null,
    listeningMessageIds: new Set(),
    isRecipientTyping: false,
    isRecipientRecording: false,
    lightboxUrl: null,
    lightboxName: '',
    replyingTo: null,
    editingMessage: null,
    addMessage: jest.fn(),
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
  }),
}));

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: null, connected: false }),
}));

jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({ openPanel: jest.fn(), closePanel: jest.fn() }),
}));

jest.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({
    friends: [],
    incoming: [],
    outgoing: [],
    blocked: [],
    sendRequest: jest.fn(),
    acceptRequest: jest.fn(),
    declineRequest: jest.fn(),
    removeFriend: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    cancelRequest: jest.fn(),
    refresh: jest.fn(),
    isFriend: jest.fn(() => false),
  }),
}));

jest.mock('@/contexts/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: jest.fn() }),
}));

jest.mock('@/hooks/useOpenUserProfile', () => ({
  useOpenUserProfile: () => jest.fn(),
}));

jest.mock('@/lib/aiBot', () => ({
  isAIBot: () => false,
}));

jest.mock('@/lib/messageCache', () => ({
  clearCachedConversation: jest.fn(),
}));

jest.mock('@/components/messaging/ChatView', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-view" />,
}));

jest.mock('@/components/messaging/ChatView/ChatView', () => ({
  __esModule: true,
  default: () => <div data-testid="chat-view" />,
}));

jest.mock('@/components/messaging/MessageInput/MessageInput', () => ({
  __esModule: true,
  default: () => <div data-testid="message-input" />,
}));

jest.mock('@/components/Lightbox/Lightbox', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/settings/BlockedUsersPanel', () => ({
  __esModule: true,
  default: () => null,
}));

describe('ConversationView', () => {
  const baseProps = {
    recipientId: 'user-1',
    isDark: true,
  };

  it('renders ChatView', () => {
    render(<ConversationView {...baseProps} />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });

  it('renders MessageInput', () => {
    render(<ConversationView {...baseProps} />);
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('shows accept/decline bar for incoming pending request', () => {
    render(
      <ConversationView
        {...baseProps}
        conversationId="conv-1"
        conversationStatus="pending"
        isInitiator={false}
      />,
    );
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Deny')).toBeInTheDocument();
  });

  it('does not show accept/decline for outgoing requests', () => {
    render(
      <ConversationView
        {...baseProps}
        conversationId="conv-1"
        conversationStatus="pending"
        isInitiator={true}
      />,
    );
    expect(screen.queryByText('Accept')).not.toBeInTheDocument();
    expect(screen.queryByText('Deny')).not.toBeInTheDocument();
  });

  it('shows Accept and Deny buttons for incoming request', () => {
    render(
      <ConversationView
        {...baseProps}
        conversationId="conv-1"
        conversationStatus="pending"
        isInitiator={false}
      />,
    );
    const acceptBtn = screen.getByText('Accept');
    const denyBtn = screen.getByText('Deny');
    expect(acceptBtn.closest('button')).toBeInTheDocument();
    expect(denyBtn.closest('button')).toBeInTheDocument();
  });
});
