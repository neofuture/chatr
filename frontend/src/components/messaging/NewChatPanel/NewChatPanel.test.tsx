import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewChatPanel from './NewChatPanel';

jest.mock('@/contexts/PresenceContext', () => ({
  usePresence: () => ({
    getPresence: () => ({ status: 'offline', lastSeen: null }),
    userPresence: {},
    requestPresence: jest.fn(),
  }),
}));

jest.mock('@/components/common/PaneSearchBox/PaneSearchBox', () => {
  const { forwardRef } = require('react');
  return {
    __esModule: true,
    default: forwardRef(({ value, onChange, placeholder }: any, _ref: any) => (
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        data-testid="search-input"
      />
    )),
  };
});

jest.mock('@/components/common/UserRow/UserRow', () => ({
  __esModule: true,
  default: ({ displayName, onClick }: any) => (
    <div data-testid="user-row" onClick={onClick}>
      {displayName}
    </div>
  ),
}));

const mockOnSelectUser = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  mockOnSelectUser.mockClear();
  (global.fetch as jest.Mock) = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('NewChatPanel', () => {
  it('renders search box with "Search users..." placeholder', () => {
    render(<NewChatPanel isDark={false} onSelectUser={mockOnSelectUser} />);
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
  });

  it('shows empty state message', () => {
    render(<NewChatPanel isDark={false} onSelectUser={mockOnSelectUser} />);
    expect(screen.getByText('Search for a user to start a conversation')).toBeInTheDocument();
  });

  it('shows "Searching..." when loading', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => {}),
    );
    render(<NewChatPanel isDark={false} onSelectUser={mockOnSelectUser} />);

    await user.type(screen.getByTestId('search-input'), 'alice');
    jest.advanceTimersByTime(300);

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('displays search results', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: 'u1', username: 'alice', displayName: 'Alice', profileImage: null, isFriend: false, friendship: null },
        ],
      }),
    });
    render(<NewChatPanel isDark={false} onSelectUser={mockOnSelectUser} />);

    await user.type(screen.getByTestId('search-input'), 'alice');
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('calls onSelectUser when user clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: 'u1', username: 'alice', displayName: 'Alice', profileImage: null, isFriend: false, friendship: null },
        ],
      }),
    });
    render(<NewChatPanel isDark={false} onSelectUser={mockOnSelectUser} />);

    await user.type(screen.getByTestId('search-input'), 'alice');
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Alice'));
    expect(mockOnSelectUser).toHaveBeenCalledWith('u1', {
      displayName: 'Alice',
      username: 'alice',
      profileImage: null,
    });
  });
});
