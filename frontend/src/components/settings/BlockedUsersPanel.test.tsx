import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BlockedUsersPanel from './BlockedUsersPanel';

const mockUnblockUser = jest.fn();
const mockShowConfirmation = jest.fn();
const mockOpenUserProfile = jest.fn();

jest.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({
    blocked: mockBlocked,
    unblockUser: mockUnblockUser,
  }),
}));

jest.mock('@/contexts/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: mockShowConfirmation }),
}));

jest.mock('@/hooks/useOpenUserProfile', () => ({
  useOpenUserProfile: () => mockOpenUserProfile,
}));

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: ({ displayName, onClick }: any) => (
    <div data-testid="avatar" onClick={onClick}>{displayName}</div>
  ),
}));

let mockBlocked: any[] = [];

const BLOCKED_USERS = [
  {
    friendshipId: 'f1',
    user: { id: 'u1', username: '@blockeduser1', displayName: 'Blocked One', profileImage: null },
  },
  {
    friendshipId: 'f2',
    user: { id: 'u2', username: '@blockeduser2', displayName: null, profileImage: 'img.png' },
  },
];

describe('BlockedUsersPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBlocked = [];
  });

  it('renders empty state when no blocked users', () => {
    render(<BlockedUsersPanel />);
    expect(screen.getByText('No blocked users')).toBeInTheDocument();
  });

  it('renders blocked users list', () => {
    mockBlocked = BLOCKED_USERS;
    render(<BlockedUsersPanel />);
    expect(screen.getAllByText('Blocked One')[0]).toBeInTheDocument();
    expect(screen.getAllByText('blockeduser2')[0]).toBeInTheDocument();
  });

  it('shows username for each blocked user', () => {
    mockBlocked = BLOCKED_USERS;
    render(<BlockedUsersPanel />);
    expect(screen.getByText('@blockeduser1')).toBeInTheDocument();
    expect(screen.getByText('@blockeduser2')).toBeInTheDocument();
  });

  it('renders unblock button for each user', () => {
    mockBlocked = BLOCKED_USERS;
    render(<BlockedUsersPanel />);
    const buttons = screen.getAllByText('Unblock');
    expect(buttons).toHaveLength(2);
  });

  it('shows confirmation dialog on unblock click', async () => {
    mockBlocked = BLOCKED_USERS;
    mockShowConfirmation.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<BlockedUsersPanel />);
    await user.click(screen.getAllByText('Unblock')[0]);
    expect(mockShowConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Unblock User',
        message: 'Are you sure you want to unblock Blocked One?',
      }),
    );
  });

  it('calls unblockUser when confirmed', async () => {
    mockBlocked = BLOCKED_USERS;
    mockShowConfirmation.mockResolvedValue(true);
    const user = userEvent.setup();
    render(<BlockedUsersPanel />);
    await user.click(screen.getAllByText('Unblock')[0]);
    expect(mockUnblockUser).toHaveBeenCalledWith('u1');
  });

  it('does not call unblockUser when cancelled', async () => {
    mockBlocked = BLOCKED_USERS;
    mockShowConfirmation.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<BlockedUsersPanel />);
    await user.click(screen.getAllByText('Unblock')[0]);
    expect(mockUnblockUser).not.toHaveBeenCalled();
  });

  it('opens user profile on avatar click', async () => {
    mockBlocked = BLOCKED_USERS;
    const user = userEvent.setup();
    render(<BlockedUsersPanel />);
    await user.click(screen.getAllByTestId('avatar')[0]);
    expect(mockOpenUserProfile).toHaveBeenCalledWith('u1', 'Blocked One', null);
  });
});
