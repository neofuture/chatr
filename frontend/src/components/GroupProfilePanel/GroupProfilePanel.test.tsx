import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import GroupProfilePanel from './GroupProfilePanel';

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

jest.mock('@/contexts/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: jest.fn() }),
}));

jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({
    openPanel: jest.fn(),
    closePanel: jest.fn(),
    updatePanelMeta: jest.fn(),
  }),
}));

jest.mock('@/hooks/useOpenUserProfile', () => ({
  useOpenUserProfile: () => jest.fn(),
}));

jest.mock('@/contexts/PresenceContext', () => ({
  usePresence: () => ({
    getPresence: () => ({ status: 'offline', lastSeen: null }),
    requestPresence: jest.fn(),
  }),
}));

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: null, connected: false }),
}));

jest.mock('@/lib/imageUrl', () => ({
  imageUrl: (url: string | null) => url,
}));

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: ({ displayName }: { displayName: string }) => (
    <div data-testid="presence-avatar">{displayName}</div>
  ),
}));

jest.mock('@/components/image-manip/CoverImageCropper/CoverImageCropper', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/image-manip/ProfileImageCropper/ProfileImageCropper', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/settings/SettingsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="settings-panel" />,
}));

const mockGroup = {
  id: 'g1',
  name: 'Test Group',
  profileImage: null,
  coverImage: null,
  members: [
    {
      id: 'm1',
      userId: 'owner-1',
      role: 'owner',
      user: { id: 'owner-1', username: 'alice', displayName: 'Alice', profileImage: null },
    },
    {
      id: 'm2',
      userId: 'user-2',
      role: 'member',
      user: { id: 'user-2', username: 'bob', displayName: 'Bob', profileImage: null },
    },
  ],
};

beforeEach(() => {
  (global.fetch as jest.Mock) = jest.fn();
});

describe('GroupProfilePanel', () => {
  it('shows loading spinner initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const { container } = render(
      <GroupProfilePanel groupId="g1" currentUserId="owner-1" />,
    );
    expect(container.querySelector('i.fa-spin')).toBeTruthy();
  });

  it('renders group name and member count after fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ group: mockGroup }),
    });
    render(<GroupProfilePanel groupId="g1" currentUserId="owner-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
      expect(screen.getByText('2 members')).toBeInTheDocument();
    });
  });

  it('shows error state on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    render(<GroupProfilePanel groupId="g1" currentUserId="owner-1" />);

    await waitFor(() => {
      expect(screen.getByText('Could not load group')).toBeInTheDocument();
    }, { timeout: 8000 });
  });

  it('renders all members with correct role sections', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ group: mockGroup }),
    });
    render(<GroupProfilePanel groupId="g1" currentUserId="owner-1" />);

    await waitFor(() => {
      expect(screen.getAllByText(/Alice/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Bob/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Owner/)).toBeInTheDocument();
      expect(screen.getAllByText(/Members/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows Leave Group button', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ group: mockGroup }),
    });
    render(<GroupProfilePanel groupId="g1" currentUserId="owner-1" />);

    await waitFor(() => {
      expect(screen.getByText('Leave Group')).toBeInTheDocument();
    });
  });

  it('shows Make Admin button for non-admin members when viewed by admin', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ group: mockGroup }),
    });
    render(<GroupProfilePanel groupId="g1" currentUserId="owner-1" />);

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });

    // Click the "Actions" button for the non-admin member to open the bottom sheet
    const actionBtns = screen.getAllByTitle('Actions');
    fireEvent.click(actionBtns[actionBtns.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('Make Admin')).toBeInTheDocument();
    });
  });

  it('shows edit icon for admin users', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ group: mockGroup }),
    });
    const { container } = render(
      <GroupProfilePanel groupId="g1" currentUserId="owner-1" />,
    );

    await waitFor(() => {
      expect(container.querySelector('i.fa-pen')).toBeTruthy();
    });
  });

  it('does not show edit icon for regular members', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ group: mockGroup }),
    });
    const { container } = render(
      <GroupProfilePanel groupId="g1" currentUserId="user-2" />,
    );

    await waitFor(() => {
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });
    expect(container.querySelector('i.fa-pen')).toBeFalsy();
  });
});
