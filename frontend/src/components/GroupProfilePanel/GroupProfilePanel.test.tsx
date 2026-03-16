import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupProfilePanel from './GroupProfilePanel';

const mockShowToast = jest.fn();
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockShowConfirmation = jest.fn();
jest.mock('@/contexts/ConfirmationContext', () => ({
  useConfirmation: () => ({ showConfirmation: mockShowConfirmation }),
}));

const mockOpenPanel = jest.fn();
const mockClosePanel = jest.fn();
const mockUpdatePanelMeta = jest.fn();
jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({
    openPanel: mockOpenPanel,
    closePanel: mockClosePanel,
    updatePanelMeta: mockUpdatePanelMeta,
  }),
}));

jest.mock('@/contexts/PresenceContext', () => ({
  usePresence: () => ({
    getPresence: () => ({ status: 'offline', lastSeen: null }),
    requestPresence: jest.fn(),
  }),
}));

const mockSocket = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};
jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: mockSocket }),
}));

const mockOpenUserProfile = jest.fn();
jest.mock('@/hooks/useOpenUserProfile', () => ({
  useOpenUserProfile: () => mockOpenUserProfile,
}));

const mockSocketFirst = jest.fn();
jest.mock('@/lib/socketRPC', () => ({
  socketFirst: (...args: any[]) => mockSocketFirst(...args),
}));

jest.mock('@/lib/imageUrl', () => ({
  imageUrl: (url: string | null) => url,
}));

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: ({ displayName, onClick }: any) => (
    <div data-testid="avatar" onClick={onClick}>{displayName}</div>
  ),
}));

jest.mock('@/components/image-manip/CoverImageCropper/CoverImageCropper', () => ({
  __esModule: true,
  default: () => <div data-testid="cover-cropper" />,
}));

jest.mock('@/components/image-manip/ProfileImageCropper/ProfileImageCropper', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-cropper" />,
}));

jest.mock('@/components/dialogs/BottomSheet/BottomSheet', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, title, children }: any) =>
    isOpen ? (
      <div data-testid="bottom-sheet">
        <span>{title}</span>
        <button onClick={onClose}>Close Sheet</button>
        {children}
      </div>
    ) : null,
}));

jest.mock('@/components/settings/SettingsPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="settings-panel" />,
}));

jest.mock('./AddGroupMembersPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="add-members-panel" />,
}));

const makeGroup = () => ({
  id: 'g1',
  name: 'Test Group',
  description: 'A test group',
  profileImage: null,
  coverImage: null,
  ownerId: 'owner1',
  members: [
    { id: 'm1', userId: 'owner1', role: 'owner', status: 'accepted', user: { id: 'owner1', username: '@alice', displayName: 'Alice', profileImage: null } },
    { id: 'm2', userId: 'admin1', role: 'admin', status: 'accepted', user: { id: 'admin1', username: '@bob', displayName: 'Bob', profileImage: null } },
    { id: 'm3', userId: 'member1', role: 'member', status: 'accepted', user: { id: 'member1', username: '@charlie', displayName: 'Charlie', profileImage: null } },
    { id: 'm4', userId: 'pending1', role: 'member', status: 'pending', user: { id: 'pending1', username: '@dave', displayName: 'Dave', profileImage: null } },
  ],
});

describe('GroupProfilePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketFirst.mockResolvedValue({ group: makeGroup() });
  });

  const defaultProps = {
    groupId: 'g1',
    currentUserId: 'owner1',
    initialGroup: makeGroup(),
  };

  it('renders without crashing', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('shows loading state when no initialGroup', () => {
    render(<GroupProfilePanel groupId="g1" currentUserId="owner1" />);
    // Shows loading spinner (fa-spin class)
    const spinner = document.querySelector('.fa-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows error state on fetch failure', async () => {
    mockSocketFirst.mockRejectedValue(new Error('fail'));
    render(<GroupProfilePanel groupId="g1" currentUserId="owner1" />);
    await waitFor(() => {
      expect(screen.getByText('Could not load group')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('displays group name', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('displays member count', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText(/3 members/)).toBeInTheDocument();
  });

  it('displays pending count', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText(/1 pending/)).toBeInTheDocument();
  });

  it('shows Owners section', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText(/Owner/)).toBeInTheDocument();
    expect(screen.getByText('Alice (you)')).toBeInTheDocument();
  });

  it('shows Admins section', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Members section', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    // "Members" appears both as section title and in "3 members" count
    expect(screen.getAllByText(/Members/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Charlie').length).toBeGreaterThanOrEqual(1);
  });

  it('shows pending members with Pending badge', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getAllByText('Dave').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Add Members" button for admin', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText('Add Members')).toBeInTheDocument();
  });

  it('hides "Add Members" button for non-admin', () => {
    render(<GroupProfilePanel {...defaultProps} currentUserId="member1" />);
    expect(screen.queryByText('Add Members')).not.toBeInTheDocument();
  });

  it('shows "Leave Group" button', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText('Leave Group')).toBeInTheDocument();
  });

  it('opens add members panel on click', async () => {
    const user = userEvent.setup();
    render(<GroupProfilePanel {...defaultProps} />);
    await user.click(screen.getByText('Add Members'));
    expect(mockOpenPanel).toHaveBeenCalledWith(
      'add-members-g1',
      expect.anything(),
      'Add Members',
      'center',
      undefined,
      undefined,
      true,
    );
  });

  it('shows cover image with default', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    const coverImg = screen.getByAltText('Cover');
    expect(coverImg).toHaveAttribute('src', '/cover/default-cover.jpg');
  });

  it('shows avatar fallback initial when no profile image', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('shows avatar image when profile image exists', () => {
    const group = makeGroup();
    (group as any).profileImage = '/test-avatar.jpg';
    render(<GroupProfilePanel {...defaultProps} initialGroup={group} />);
    const avatarImg = screen.getByAltText('Test Group');
    expect(avatarImg).toBeInTheDocument();
  });

  it('shows edit icon next to name for admin', () => {
    const { container } = render(<GroupProfilePanel {...defaultProps} />);
    expect(container.querySelector('.fa-pen')).toBeInTheDocument();
  });

  it('does not show edit icon for regular member', () => {
    const { container } = render(<GroupProfilePanel {...defaultProps} currentUserId="member1" />);
    expect(container.querySelector('.fa-pen')).not.toBeInTheDocument();
  });

  it('allows editing group name', async () => {
    const user = userEvent.setup();
    // First call is the initial fetchGroup, second is the handleSaveName
    mockSocketFirst
      .mockResolvedValueOnce({ group: makeGroup() }) // initial fetch
      .mockResolvedValueOnce({ group: { name: 'New Name' } }); // save name
    render(<GroupProfilePanel {...defaultProps} />);

    await user.click(screen.getByText('Test Group'));
    const nameInput = screen.getByDisplayValue('Test Group');
    expect(nameInput).toBeInTheDocument();
    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    const saveBtn = document.querySelector('[class*="nameSaveBtn"]');
    if (saveBtn) await user.click(saveBtn as HTMLElement);

    await waitFor(() => {
      // The save call should have been made (at least 2 calls: fetch + save)
      expect(mockSocketFirst.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('handles leave group', async () => {
    const user = userEvent.setup();
    const onGroupLeft = jest.fn();
    mockShowConfirmation.mockResolvedValue(true);
    // Initial fetch + leave group call
    mockSocketFirst
      .mockResolvedValueOnce({ group: makeGroup() })
      .mockResolvedValueOnce({});
    render(<GroupProfilePanel {...defaultProps} onGroupLeft={onGroupLeft} />);

    await user.click(screen.getByText('Leave Group'));

    await waitFor(() => {
      expect(mockShowConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Leave Group' }),
      );
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Left'), 'success');
    });
  });

  it('cancels leave group when not confirmed', async () => {
    const user = userEvent.setup();
    const onGroupLeft = jest.fn();
    mockShowConfirmation.mockResolvedValue(false);
    render(<GroupProfilePanel {...defaultProps} onGroupLeft={onGroupLeft} />);

    await user.click(screen.getByText('Leave Group'));
    await waitFor(() => {
      expect(onGroupLeft).not.toHaveBeenCalled();
    });
  });

  it('shows camera buttons for admin', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    expect(screen.getByLabelText('Change cover image')).toBeInTheDocument();
    expect(screen.getByLabelText('Change group avatar')).toBeInTheDocument();
  });

  it('hides camera buttons for non-admin', () => {
    render(<GroupProfilePanel {...defaultProps} currentUserId="member1" />);
    expect(screen.queryByLabelText('Change cover image')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Change group avatar')).not.toBeInTheDocument();
  });

  it('opens cover sheet on camera click', async () => {
    const user = userEvent.setup();
    render(<GroupProfilePanel {...defaultProps} />);
    await user.click(screen.getByLabelText('Change cover image'));
    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
    expect(screen.getByText('Cover Image')).toBeInTheDocument();
  });

  it('opens avatar sheet on camera click', async () => {
    const user = userEvent.setup();
    render(<GroupProfilePanel {...defaultProps} />);
    await user.click(screen.getByLabelText('Change group avatar'));
    expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
    expect(screen.getByText('Group Picture')).toBeInTheDocument();
  });

  it('registers socket listeners for real-time updates', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    const events = mockSocket.on.mock.calls.map((c: any) => c[0]);
    expect(events).toContain('group:updated');
    expect(events).toContain('group:memberJoined');
    expect(events).toContain('group:memberLeft');
    expect(events).toContain('group:memberPromoted');
    expect(events).toContain('group:memberDemoted');
  });

  it('cleans up socket listeners on unmount', () => {
    const { unmount } = render(<GroupProfilePanel {...defaultProps} />);
    unmount();
    const events = mockSocket.off.mock.calls.map((c: any) => c[0]);
    expect(events).toContain('group:updated');
    expect(events).toContain('group:memberJoined');
  });

  it('shows more button for members that owner can manage', () => {
    render(<GroupProfilePanel {...defaultProps} />);
    const moreButtons = screen.getAllByTitle('Actions');
    expect(moreButtons.length).toBeGreaterThan(0);
  });

  it('opens member action bottom sheet', async () => {
    const user = userEvent.setup();
    render(<GroupProfilePanel {...defaultProps} />);
    const moreButtons = screen.getAllByTitle('Actions');
    await user.click(moreButtons[0]);
    await waitFor(() => {
      expect(screen.getByTestId('bottom-sheet')).toBeInTheDocument();
    });
  });
});
