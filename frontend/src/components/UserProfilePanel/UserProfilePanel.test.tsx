import { render, screen, waitFor } from '@testing-library/react';
import UserProfilePanel from './UserProfilePanel';

jest.mock('@/contexts/PresenceContext', () => ({
  usePresence: () => ({
    getPresence: () => ({ status: 'online', lastSeen: null }),
    userPresence: {},
    requestPresence: jest.fn(),
  }),
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
  }),
}));

jest.mock('@/contexts/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: jest.fn() }),
}));

jest.mock('@/components/PresenceLabel/PresenceLabel', () => ({
  __esModule: true,
  default: () => <span data-testid="presence-label">Online</span>,
}));

beforeEach(() => {
  (global.fetch as jest.Mock) = jest.fn();
});

describe('UserProfilePanel', () => {
  it('shows loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<UserProfilePanel userId="u1" />);
    expect(container.querySelector('i.fa-spin')).toBeTruthy();
  });

  it('renders profile after fetch resolves', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 'u1',
          username: 'johndoe',
          displayName: 'John Doe',
          profileImage: null,
          coverImage: null,
          lastSeen: null,
        },
      }),
    });
    render(<UserProfilePanel userId="u1" />);

    await waitFor(() => {
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "Could not load profile" on fetch error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
    render(<UserProfilePanel userId="u1" />);

    await waitFor(() => {
      expect(screen.getByText('Could not load profile')).toBeInTheDocument();
    });
  });

  it("displays user's display name and username", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        user: {
          id: 'u1',
          username: 'janedoe',
          displayName: 'Jane Doe',
          profileImage: null,
          coverImage: null,
          lastSeen: null,
        },
      }),
    });
    render(<UserProfilePanel userId="u1" />);

    await waitFor(() => {
      expect(screen.getAllByText('Jane Doe').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('@janedoe').length).toBeGreaterThanOrEqual(1);
    });
  });
});
