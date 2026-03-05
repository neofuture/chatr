import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmationProvider } from '@/contexts/ConfirmationContext';
import ConfirmationDialog from '@/components/dialogs/ConfirmationDialog/ConfirmationDialog';
import FriendsPanel from './FriendsPanel';

const mockRemoveFriend = jest.fn();
const mockSendRequest = jest.fn();
const mockAcceptRequest = jest.fn();
const mockDeclineRequest = jest.fn();
const mockBlockUser = jest.fn();
const mockUnblockUser = jest.fn();
const mockSetSearchQuery = jest.fn();

const friendAlice = {
  friendshipId: 'fs-1',
  user: { id: 'u1', username: '@alice', displayName: 'Alice Smith', profileImage: null },
};

const friendBob = {
  friendshipId: 'fs-2',
  user: { id: 'u2', username: '@bob', displayName: 'Bob Jones', profileImage: null },
};

let mockFriendsData: any = {
  friends: [friendAlice, friendBob],
  incoming: [],
  outgoing: [],
  blocked: [],
  loading: false,
  searchQuery: '',
  setSearchQuery: mockSetSearchQuery,
  searchResults: [],
  searching: false,
  sendRequest: mockSendRequest,
  acceptRequest: mockAcceptRequest,
  declineRequest: mockDeclineRequest,
  removeFriend: mockRemoveFriend,
  blockUser: mockBlockUser,
  unblockUser: mockUnblockUser,
};

jest.mock('@/hooks/useFriends', () => ({
  useFriends: () => mockFriendsData,
}));

jest.mock('@/hooks/useOpenUserProfile', () => ({
  useOpenUserProfile: () => jest.fn(),
}));

jest.mock('@/contexts/PresenceContext', () => ({
  usePresence: () => ({
    userPresence: {},
    requestPresence: jest.fn(),
  }),
}));

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));

jest.mock('@/components/common/PaneSearchBox/PaneSearchBox', () => ({
  __esModule: true,
  default: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

function renderWithProviders(props: any = {}) {
  return render(
    <ConfirmationProvider>
      <FriendsPanel {...props} />
      <ConfirmationDialog />
    </ConfirmationProvider>
  );
}

describe('FriendsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFriendsData = {
      friends: [friendAlice, friendBob],
      incoming: [],
      outgoing: [],
      blocked: [],
      loading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      searchResults: [],
      searching: false,
      sendRequest: mockSendRequest,
      acceptRequest: mockAcceptRequest,
      declineRequest: mockDeclineRequest,
      removeFriend: mockRemoveFriend,
      blockUser: mockBlockUser,
      unblockUser: mockUnblockUser,
    };
  });

  describe('Friends list rendering', () => {
    it('renders friends list', () => {
      renderWithProviders();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });

    it('shows empty state when no friends', () => {
      mockFriendsData.friends = [];
      renderWithProviders();
      expect(screen.getByText(/No friends yet/)).toBeInTheDocument();
    });
  });

  describe('Remove friend confirmation dialog', () => {
    it('shows confirmation dialog when clicking remove button', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      const removeButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('.fa-user-minus')
      );
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });
      expect(screen.getByText('Remove Friend')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to remove Alice Smith/)).toBeInTheDocument();
    });

    it('removes friend when clicking Remove in the dialog', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      const removeButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('.fa-user-minus')
      );
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Remove' }));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      expect(mockRemoveFriend).toHaveBeenCalledWith('fs-1', 'u1');
    });

    it('does not remove friend when clicking Cancel in the dialog', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      const removeButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('.fa-user-minus')
      );
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Cancel'));

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      expect(mockRemoveFriend).not.toHaveBeenCalled();
    });

    it('does not remove friend when dismissing dialog with Escape', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      const removeButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('.fa-user-minus')
      );
      await user.click(removeButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      });
      expect(mockRemoveFriend).not.toHaveBeenCalled();
    });

    it('shows the correct friend name in the confirmation message', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      const removeButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('.fa-user-minus')
      );
      // Click the second friend's remove button
      await user.click(removeButtons[1]);

      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to remove Bob Jones/)).toBeInTheDocument();
      });
    });
  });

  describe('Message button', () => {
    it('calls onStartChat when clicking message button', async () => {
      const onStartChat = jest.fn();
      const user = userEvent.setup();
      renderWithProviders({ onStartChat });

      const msgButtons = screen.getAllByRole('button').filter(
        btn => btn.querySelector('.fa-comment')
      );
      await user.click(msgButtons[0]);

      expect(onStartChat).toHaveBeenCalledWith('u1', 'Alice Smith', null, true, 'fs-1');
    });
  });
});
