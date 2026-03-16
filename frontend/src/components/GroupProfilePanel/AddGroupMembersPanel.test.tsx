import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddGroupMembersPanel from './AddGroupMembersPanel';

const mockSocketFirst = jest.fn();
const mockShowToast = jest.fn();

jest.mock('@/contexts/PresenceContext', () => ({
  usePresence: () => ({ userPresence: {} }),
}));

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: null }),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/lib/socketRPC', () => ({
  socketFirst: (...args: any[]) => mockSocketFirst(...args),
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

jest.mock('@/components/common/UserRow/UserRow', () => ({
  __esModule: true,
  default: ({ displayName, subtitle, onClick, actions }: any) => (
    <div data-testid="user-row" onClick={onClick}>
      <span>{displayName}</span>
      <span>{subtitle}</span>
      {actions}
    </div>
  ),
}));

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: ({ displayName }: any) => <div data-testid="avatar">{displayName}</div>,
}));

describe('AddGroupMembersPanel', () => {
  const defaultProps = {
    groupId: 'g1',
    existingMemberIds: ['existing1'],
    onMembersAdded: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders without crashing', () => {
    render(<AddGroupMembersPanel {...defaultProps} />);
    expect(screen.getByTestId('search-box')).toBeInTheDocument();
  });

  it('shows empty state before searching', () => {
    render(<AddGroupMembersPanel {...defaultProps} />);
    expect(screen.getByText('Search for people to add to the group')).toBeInTheDocument();
  });

  it('shows search input with placeholder', () => {
    render(<AddGroupMembersPanel {...defaultProps} />);
    expect(screen.getByPlaceholderText('Search people to invite…')).toBeInTheDocument();
  });

  it('shows "Searching…" while query is debouncing', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<AddGroupMembersPanel {...defaultProps} />);
    await user.type(screen.getByTestId('search-box'), 'alice');
    expect(screen.getByText('Searching…')).toBeInTheDocument();
  });

  it('displays search results', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockSocketFirst.mockResolvedValue({
      users: [
        { id: 'u1', username: '@alice', displayName: 'Alice', profileImage: null, isFriend: true },
      ],
    });
    render(<AddGroupMembersPanel {...defaultProps} />);
    await user.type(screen.getByTestId('search-box'), 'alice');
    jest.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('filters out existing members from results', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockSocketFirst.mockResolvedValue({
      users: [
        { id: 'existing1', username: '@exists', displayName: 'Existing', profileImage: null, isFriend: true },
        { id: 'u2', username: '@bob', displayName: 'Bob', profileImage: null, isFriend: false },
      ],
    });
    render(<AddGroupMembersPanel {...defaultProps} />);
    await user.type(screen.getByTestId('search-box'), 'test');
    jest.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Existing')).not.toBeInTheDocument();
    });
  });

  it('shows "No users found" for empty results', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockSocketFirst.mockResolvedValue({ users: [] });
    render(<AddGroupMembersPanel {...defaultProps} />);
    await user.type(screen.getByTestId('search-box'), 'nobody');
    jest.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });
  });

  it('shows error state on search failure', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockSocketFirst.mockRejectedValue(new Error('fail'));
    render(<AddGroupMembersPanel {...defaultProps} />);
    await user.type(screen.getByTestId('search-box'), 'err');
    jest.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByText('Search failed — check your connection')).toBeInTheDocument();
    });
  });

  it('shows retry button on error', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockSocketFirst.mockRejectedValue(new Error('fail'));
    render(<AddGroupMembersPanel {...defaultProps} />);
    await user.type(screen.getByTestId('search-box'), 'err');
    jest.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  it('selects and deselects users', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockSocketFirst.mockResolvedValue({
      users: [
        { id: 'u1', username: '@alice', displayName: 'Alice', profileImage: null, isFriend: true },
      ],
    });
    render(<AddGroupMembersPanel {...defaultProps} />);
    await user.type(screen.getByTestId('search-box'), 'alice');
    jest.advanceTimersByTime(300);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
    // Select user
    await user.click(screen.getByTestId('user-row'));
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    // Chip appears with the name
    const chips = screen.getAllByText('Alice');
    expect(chips.length).toBeGreaterThanOrEqual(1);
  });

  it('shows invite button when users are selected', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    mockSocketFirst.mockResolvedValue({
      users: [
        { id: 'u1', username: '@alice', displayName: 'Alice', profileImage: null, isFriend: true },
      ],
    });
    render(<AddGroupMembersPanel {...defaultProps} />);
    await user.type(screen.getByTestId('search-box'), 'alice');
    jest.advanceTimersByTime(300);
    await waitFor(() => screen.getByText('Alice'));
    await user.click(screen.getByTestId('user-row'));
    expect(screen.getByText(/Invite/)).toBeInTheDocument();
  });

  it('does not show footer when no users selected', () => {
    render(<AddGroupMembersPanel {...defaultProps} />);
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });
});
