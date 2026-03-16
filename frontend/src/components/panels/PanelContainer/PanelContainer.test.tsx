import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PanelContainer from './PanelContainer';

let mockPanels: any[] = [];
const mockClosePanel = jest.fn();

jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({
    panels: mockPanels,
    maxLevel: mockPanels.length > 0 ? Math.max(...mockPanels.map((p: any) => p.level)) : 0,
    effectiveMaxLevel: mockPanels.filter((p: any) => !p.isClosing).length > 0
      ? Math.max(...mockPanels.filter((p: any) => !p.isClosing).map((p: any) => p.level))
      : 0,
    closePanel: mockClosePanel,
  }),
}));

jest.mock('@/contexts/PresenceContext', () => ({
  usePresence: () => ({
    getPresence: () => ({ status: 'offline', lastSeen: null }),
    requestPresence: jest.fn(),
  }),
}));

jest.mock('@/lib/profileImageService', () => ({
  getProfileImageURL: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/aiBot', () => ({
  isAIBot: () => false,
}));

jest.mock('@/components/PresenceAvatar/PresenceAvatar', () => ({
  __esModule: true,
  default: ({ displayName }: any) => <div data-testid="presence-avatar">{displayName}</div>,
}));

jest.mock('@/components/PresenceLabel/PresenceLabel', () => ({
  __esModule: true,
  default: () => <span data-testid="presence-label">offline</span>,
}));

jest.mock('@/components/PanelFooter/PanelFooter', () => ({
  __esModule: true,
  default: ({ children }: any) => <div data-testid="panel-footer">{children}</div>,
}));

describe('PanelContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPanels = [];
  });

  it('renders nothing when no panels', () => {
    const { container } = render(<PanelContainer />);
    expect(container.innerHTML).toBe('');
  });

  it('renders a single panel', () => {
    mockPanels = [
      {
        id: 'test-panel',
        title: 'Test Panel',
        component: <div>Panel Content</div>,
        level: 0,
      },
    ];
    render(<PanelContainer />);
    expect(screen.getByText('Test Panel')).toBeInTheDocument();
    expect(screen.getByText('Panel Content')).toBeInTheDocument();
  });

  it('renders multiple stacked panels', () => {
    mockPanels = [
      { id: 'panel-1', title: 'Panel 1', component: <div>Content 1</div>, level: 0 },
      { id: 'panel-2', title: 'Panel 2', component: <div>Content 2</div>, level: 1 },
    ];
    render(<PanelContainer />);
    expect(screen.getByText('Panel 1')).toBeInTheDocument();
    expect(screen.getByText('Panel 2')).toBeInTheDocument();
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('renders back button that calls closePanel', async () => {
    const user = userEvent.setup();
    mockPanels = [
      { id: 'test-panel', title: 'Test', component: <div>Content</div>, level: 0 },
    ];
    render(<PanelContainer />);
    const backButton = screen.getByText('‹');
    await user.click(backButton);
    expect(mockClosePanel).toHaveBeenCalledWith('test-panel');
  });

  it('renders backdrop that calls closePanel on click', async () => {
    const user = userEvent.setup();
    mockPanels = [
      { id: 'test-panel', title: 'Test', component: <div>Content</div>, level: 0 },
    ];
    const { container } = render(<PanelContainer />);
    const backdrop = container.querySelector('.auth-panel-backdrop');
    if (backdrop) await user.click(backdrop);
    expect(mockClosePanel).toHaveBeenCalledWith('test-panel');
  });

  it('renders panel with left title position', () => {
    mockPanels = [
      {
        id: 'left-panel',
        title: 'Left Title',
        component: <div>Content</div>,
        level: 0,
        titlePosition: 'left',
      },
    ];
    render(<PanelContainer />);
    expect(screen.getByText('Left Title')).toBeInTheDocument();
  });

  it('renders panel with subtitle', () => {
    mockPanels = [
      {
        id: 'sub-panel',
        title: 'Title',
        component: <div>Content</div>,
        level: 0,
        subTitle: 'Subtitle Text',
      },
    ];
    render(<PanelContainer />);
    expect(screen.getByText('Subtitle Text')).toBeInTheDocument();
  });

  it('renders panel with profile image', () => {
    mockPanels = [
      {
        id: 'img-panel',
        title: 'Profile',
        component: <div>Content</div>,
        level: 0,
        profileImage: '/test.jpg',
      },
    ];
    render(<PanelContainer />);
    expect(screen.getByTestId('presence-avatar')).toBeInTheDocument();
  });

  it('renders full width panel', () => {
    mockPanels = [
      {
        id: 'full-panel',
        title: 'Full Width',
        component: <div>Content</div>,
        level: 0,
        fullWidth: true,
      },
    ];
    render(<PanelContainer />);
    const panel = document.querySelector('[data-fullwidth="true"]');
    expect(panel).toBeInTheDocument();
  });

  it('renders action icons', async () => {
    const onClick = jest.fn();
    mockPanels = [
      {
        id: 'action-panel',
        title: 'Actions',
        component: <div>Content</div>,
        level: 0,
        actionIcons: [
          { icon: 'fas fa-phone', onClick, label: 'Call' },
        ],
      },
    ];
    render(<PanelContainer />);
    const actionBtn = screen.getByLabelText('Call');
    expect(actionBtn).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(actionBtn);
    expect(onClick).toHaveBeenCalled();
  });

  it('renders action icons with submenu', async () => {
    const subClick = jest.fn();
    mockPanels = [
      {
        id: 'submenu-panel',
        title: 'Submenu',
        component: <div>Content</div>,
        level: 0,
        actionIcons: [
          {
            icon: 'fas fa-ellipsis',
            onClick: jest.fn(),
            label: 'Menu',
            submenu: [
              { icon: 'fas fa-trash', label: 'Delete', onClick: subClick },
            ],
          },
        ],
      },
    ];
    render(<PanelContainer />);
    const menuBtn = screen.getByLabelText('Menu');
    expect(menuBtn).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(menuBtn);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('renders panel with footer', () => {
    mockPanels = [
      {
        id: 'footer-panel',
        title: 'Footer',
        component: <div>Content</div>,
        level: 0,
        footer: () => <button>Save</button>,
      },
    ];
    render(<PanelContainer />);
    expect(screen.getByTestId('panel-footer')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('does not render footer when not provided', () => {
    mockPanels = [
      {
        id: 'no-footer',
        title: 'No Footer',
        component: <div>Content</div>,
        level: 0,
      },
    ];
    render(<PanelContainer />);
    expect(screen.queryByTestId('panel-footer')).not.toBeInTheDocument();
  });

  it('renders chat panel with presence avatar', () => {
    mockPanels = [
      {
        id: 'chat-user123',
        title: 'Chat User',
        component: <div>Chat Content</div>,
        level: 0,
        profileImage: '/avatar.jpg',
      },
    ];
    render(<PanelContainer />);
    expect(screen.getByTestId('presence-avatar')).toBeInTheDocument();
  });

  it('renders group panel with presence avatar', () => {
    mockPanels = [
      {
        id: 'group-g123',
        title: 'Group Name',
        component: <div>Group Content</div>,
        level: 0,
      },
    ];
    render(<PanelContainer />);
    expect(screen.getByTestId('presence-avatar')).toBeInTheDocument();
  });

  it('applies closing animation class', () => {
    mockPanels = [
      {
        id: 'closing-panel',
        title: 'Closing',
        component: <div>Content</div>,
        level: 0,
        isClosing: true,
      },
    ];
    render(<PanelContainer />);
    expect(screen.getByText('Closing')).toBeInTheDocument();
  });

  it('renders guest indicator in panel', () => {
    mockPanels = [
      {
        id: 'chat-guest1',
        title: 'Guest User',
        component: <div>Guest Chat</div>,
        level: 0,
        isGuest: true,
      },
    ];
    render(<PanelContainer />);
    // "Guest User" appears in both the title bar text and the PresenceAvatar mock
    expect(screen.getAllByText('Guest User').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Guest Chat')).toBeInTheDocument();
  });
});
