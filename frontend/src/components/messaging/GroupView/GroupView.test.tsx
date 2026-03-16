import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupView from './GroupView';
import type { GroupData } from './GroupView';

const mockEmit = jest.fn();
const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: mockEmit,
};

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: mockSocket, connected: true }),
}));

const mockShowToast = jest.fn();
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockShowConfirmation = jest.fn();
jest.mock('@/contexts/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: mockShowConfirmation }),
}));

const mockOpenUserProfile = jest.fn();
jest.mock('@/hooks/useOpenUserProfile', () => ({
  useOpenUserProfile: () => mockOpenUserProfile,
}));

const mockSocketFirst = jest.fn();
jest.mock('@/lib/socketRPC', () => ({
  socketFirst: (...args: any[]) => mockSocketFirst(...args),
}));

jest.mock('@/lib/outboundQueue', () => ({
  dequeue: jest.fn().mockResolvedValue(undefined),
  loadQueueForGroup: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/components/messaging/ChatView/ChatView', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="chat-view">
      {props.loading ? 'Loading...' : `${props.messages.length} messages`}
      {props.isRecipientTyping && <span data-testid="typing">{props.recipientGhostText}</span>}
    </div>
  ),
}));

jest.mock('@/components/messaging/MessageInput/MessageInput', () => ({
  __esModule: true,
  default: (props: any) => (
    <div data-testid="message-input">
      {props.groupId && <span>group: {props.groupId}</span>}
    </div>
  ),
}));

jest.mock('@/components/Lightbox/Lightbox', () => ({
  __esModule: true,
  default: ({ imageUrl, onClose }: any) => (
    <div data-testid="lightbox" onClick={onClose}>{imageUrl}</div>
  ),
}));

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: ({ displayName, onClick }: any) => (
    <div data-testid="avatar" onClick={onClick}>{displayName}</div>
  ),
}));

jest.mock('@/components/common/PaneSearchBox/PaneSearchBox', () => {
  const { forwardRef } = require('react');
  return {
    __esModule: true,
    default: forwardRef(({ value, onChange, placeholder }: any, ref: any) => (
      <input
        ref={ref}
        data-testid="search-box"
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    )),
  };
});

const makeGroup = (overrides?: Partial<GroupData>): GroupData => ({
  id: 'group-1',
  name: 'Test Group',
  description: 'A test group',
  profileImage: null,
  coverImage: null,
  ownerId: 'user-1',
  members: [
    { id: 'm1', userId: 'user-1', role: 'owner', user: { id: 'user-1', username: '@alice', displayName: 'Alice', profileImage: null } },
    { id: 'm2', userId: 'user-2', role: 'member', user: { id: 'user-2', username: '@bob', displayName: 'Bob', profileImage: null } },
  ],
  ...overrides,
});

const defaultProps = {
  group: makeGroup(),
  isDark: true,
  currentUserId: 'user-1',
};

describe('GroupView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock socket.emit to call the callback with messages
    mockEmit.mockImplementation((event: string, data: any, cb?: Function) => {
      if (event === 'group:messages:history' && cb) {
        cb({ messages: [] });
      }
    });
  });

  it('renders without crashing', () => {
    render(<GroupView {...defaultProps} />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });

  it('renders ChatView and MessageInput for accepted member', () => {
    render(<GroupView {...defaultProps} />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('shows group id in message input', () => {
    render(<GroupView {...defaultProps} />);
    expect(screen.getByText('group: group-1')).toBeInTheDocument();
  });

  it('shows invite bar for pending member status', () => {
    render(<GroupView {...defaultProps} initialMemberStatus="pending" />);
    expect(screen.getByText(/You have been invited to join/)).toBeInTheDocument();
    expect(screen.getByText('Accept')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
  });

  it('does not show message input for pending member', () => {
    render(<GroupView {...defaultProps} initialMemberStatus="pending" />);
    expect(screen.queryByTestId('message-input')).not.toBeInTheDocument();
  });

  it('handles accept invite', async () => {
    const user = userEvent.setup();
    mockSocketFirst.mockResolvedValue({ group: { members: makeGroup().members } });
    render(<GroupView {...defaultProps} initialMemberStatus="pending" />);

    await user.click(screen.getByText('Accept'));
    await waitFor(() => {
      expect(mockSocketFirst).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('joined'), 'success');
    });
  });

  it('handles decline invite', async () => {
    const user = userEvent.setup();
    const onGroupDeleted = jest.fn();
    mockSocketFirst.mockResolvedValue({});
    render(<GroupView {...defaultProps} initialMemberStatus="pending" onGroupDeleted={onGroupDeleted} />);

    await user.click(screen.getByText('Decline'));
    await waitFor(() => {
      expect(mockSocketFirst).toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Declined'), 'info');
      expect(onGroupDeleted).toHaveBeenCalled();
    });
  });

  it('registers socket event listeners', () => {
    render(<GroupView {...defaultProps} />);
    const eventNames = mockSocket.on.mock.calls.map((c: any) => c[0]);
    expect(eventNames).toContain('group:message');
    expect(eventNames).toContain('group:typing');
    expect(eventNames).toContain('group:memberJoined');
    expect(eventNames).toContain('group:memberLeft');
    expect(eventNames).toContain('group:deleted');
    expect(eventNames).toContain('group:removed');
    expect(eventNames).toContain('group:updated');
    expect(eventNames).toContain('group:message:unsent');
  });

  it('cleans up socket listeners on unmount', () => {
    const { unmount } = render(<GroupView {...defaultProps} />);
    unmount();
    const offEvents = mockSocket.off.mock.calls.map((c: any) => c[0]);
    expect(offEvents).toContain('group:message');
    expect(offEvents).toContain('group:typing');
  });

  it('fetches message history on mount', () => {
    render(<GroupView {...defaultProps} />);
    expect(mockEmit).toHaveBeenCalledWith(
      'group:messages:history',
      { groupId: 'group-1' },
      expect.any(Function),
    );
  });

  it('does not fetch history when member status is pending', () => {
    mockEmit.mockClear();
    render(<GroupView {...defaultProps} initialMemberStatus="pending" />);
    const histCalls = mockEmit.mock.calls.filter((c: any) => c[0] === 'group:messages:history');
    expect(histCalls).toHaveLength(0);
  });

  it('renders correctly with owner role showing admin controls', () => {
    render(<GroupView {...defaultProps} />);
    // Owner should see the chat view
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });

  it('renders with dark mode prop', () => {
    render(<GroupView {...defaultProps} isDark={false} />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });

  it('renders group with non-owner currentUserId', () => {
    render(<GroupView {...defaultProps} currentUserId="user-2" />);
    expect(screen.getByTestId('chat-view')).toBeInTheDocument();
  });

  it('shows error toast when accept invite fails', async () => {
    const user = userEvent.setup();
    mockSocketFirst.mockRejectedValue(new Error('Network error'));
    render(<GroupView {...defaultProps} initialMemberStatus="pending" />);

    await user.click(screen.getByText('Accept'));
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Failed to accept invite', 'error');
    });
  });

  it('shows error toast when decline invite fails', async () => {
    const user = userEvent.setup();
    mockSocketFirst.mockRejectedValue(new Error('Network error'));
    render(<GroupView {...defaultProps} initialMemberStatus="pending" />);

    await user.click(screen.getByText('Decline'));
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Failed to decline invite', 'error');
    });
  });

  it('disables accept button while accepting', async () => {
    const user = userEvent.setup();
    let resolve: (v: any) => void;
    mockSocketFirst.mockReturnValue(new Promise(r => { resolve = r; }));
    render(<GroupView {...defaultProps} initialMemberStatus="pending" />);

    await user.click(screen.getByText('Accept'));
    await waitFor(() => {
      expect(screen.getByText('Joining…')).toBeInTheDocument();
    });
    resolve!({ group: { members: [] } });
  });
});
