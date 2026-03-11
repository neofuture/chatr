import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewGroupPanel from './NewGroupPanel';

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
  default: ({ displayName, onClick, actions }: any) => (
    <div data-testid="user-row" onClick={onClick}>
      {displayName}
      {actions}
    </div>
  ),
}));

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: ({ displayName }: any) => <span data-testid="presence-avatar">{displayName}</span>,
}));

const mockOnGroupCreated = jest.fn();

beforeEach(() => {
  jest.useFakeTimers();
  mockOnGroupCreated.mockClear();
  (global.fetch as jest.Mock) = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('NewGroupPanel', () => {
  it('renders search box for adding people', () => {
    render(<NewGroupPanel onGroupCreated={mockOnGroupCreated} />);
    expect(screen.getByPlaceholderText('Add people…')).toBeInTheDocument();
  });

  it('shows "Next" button after selecting a user', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: 'u1', username: 'alice', displayName: 'Alice', profileImage: null, isFriend: true },
        ],
      }),
    });

    render(<NewGroupPanel onGroupCreated={mockOnGroupCreated} />);

    await user.type(screen.getByTestId('search-input'), 'alice');
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Alice'));

    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('does not show Next button with no selections', () => {
    render(<NewGroupPanel onGroupCreated={mockOnGroupCreated} />);
    expect(screen.queryByText('Next')).not.toBeInTheDocument();
  });

  it('shows group name input on step 2', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        users: [
          { id: 'u1', username: 'alice', displayName: 'Alice', profileImage: null, isFriend: true },
        ],
      }),
    });

    render(<NewGroupPanel onGroupCreated={mockOnGroupCreated} />);

    await user.type(screen.getByTestId('search-input'), 'alice');
    jest.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Alice'));
    await user.click(screen.getByText('Next'));

    expect(screen.getByPlaceholderText('Group name…')).toBeInTheDocument();
    expect(screen.getByText('Give your group a name')).toBeInTheDocument();
  });
});
