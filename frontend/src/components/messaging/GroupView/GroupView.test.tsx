import { render, screen } from '@testing-library/react';
import GroupView from './GroupView';

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    socket: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    connected: true,
  }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/contexts/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: jest.fn() }),
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

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: () => <div data-testid="presence-avatar" />,
}));

jest.mock('@/components/common/PaneSearchBox/PaneSearchBox', () => ({
  __esModule: true,
  default: () => <div data-testid="pane-search" />,
}));

const mockGroup = {
  id: 'g1',
  name: 'Test Group',
  ownerId: 'owner-1',
  members: [
    {
      id: 'm1',
      userId: 'user-1',
      role: 'admin',
      user: { id: 'user-1', username: 'testuser', displayName: 'Test User', profileImage: null },
    },
  ],
};

describe('GroupView', () => {
  const baseProps = {
    group: mockGroup,
    isDark: true,
    currentUserId: 'user-1',
  };

  it('renders ChatView', () => {
    render(<GroupView {...baseProps} initialMemberStatus="accepted" />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });

  it('renders MessageInput when member status is accepted', () => {
    render(<GroupView {...baseProps} initialMemberStatus="accepted" />);
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('shows invite bar when initialMemberStatus is pending', () => {
    render(<GroupView {...baseProps} initialMemberStatus="pending" />);
    expect(screen.getByText(/You have been invited to join/)).toBeInTheDocument();
  });

  it('shows Accept and Decline buttons for pending invite', () => {
    render(<GroupView {...baseProps} initialMemberStatus="pending" />);
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });
});
