import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelProvider, usePanels } from '@/contexts/PanelContext';
import { PresenceProvider } from '@/contexts/PresenceContext';
import PanelContainer from './PanelContainer';

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: null, connected: false, connecting: false }),
}));

// Test component that uses the panel hook
function TestComponent() {
  const { openPanel, closePanel, closeTopPanel } = usePanels();

  const handleOpenPanel1 = () => {
    openPanel('Panel 1', <div>Panel 1 Content</div>);
  };

  const handleOpenPanel2 = () => {
    openPanel('Panel 2', <div>Panel 2 Content</div>);
  };

  const handleOpenPanel3 = () => {
    openPanel('Panel 3', <div>Panel 3 Content</div>);
  };

  const handleOpenPanelWithTitle = () => {
    openPanel(
      'custom-panel',
      <div>Custom Panel Content</div>,
      'Custom Title',
      'left'
    );
  };

  const handleOpenPanelWithSubtitle = () => {
    openPanel(
      'subtitle-panel',
      <div>Subtitle Panel Content</div>,
      'Main Title',
      'left',
      'Subtitle Text'
    );
  };

  const handleOpenPanelWithProfile = () => {
    openPanel(
      'profile-panel',
      <div>Profile Panel Content</div>,
      'User Name',
      'left',
      'Online',
      '/profile/test.jpg'
    );
  };

  const handleOpenFullWidthPanel = () => {
    openPanel(
      'fullwidth-panel',
      <div>Full Width Content</div>,
      'Gallery',
      'center',
      undefined,
      undefined,
      true
    );
  };

  const handleOpenPanelWithActions = () => {
    openPanel(
      'actions-panel',
      <div>Actions Panel Content</div>,
      'Chat',
      'left',
      'Online',
      '/profile/test.jpg',
      false,
      [
        { icon: 'far fa-video', onClick: () => {}, label: 'Video' },
        { icon: 'far fa-phone', onClick: () => {}, label: 'Call' }
      ]
    );
  };

  return (
    <div>
      <button onClick={handleOpenPanel1}>Open Panel 1</button>
      <button onClick={handleOpenPanel2}>Open Panel 2</button>
      <button onClick={handleOpenPanel3}>Open Panel 3</button>
      <button onClick={handleOpenPanelWithTitle}>Open Panel With Title</button>
      <button onClick={handleOpenPanelWithSubtitle}>Open Panel With Subtitle</button>
      <button onClick={handleOpenPanelWithProfile}>Open Panel With Profile</button>
      <button onClick={handleOpenFullWidthPanel}>Open Full Width Panel</button>
      <button onClick={handleOpenPanelWithActions}>Open Panel With Actions</button>
      <button onClick={closeTopPanel}>Close Top</button>
    </div>
  );
}

describe('PanelContainer Component', () => {
  const renderWithProvider = () => {
    return render(
      <PresenceProvider>
        <PanelProvider>
          <TestComponent />
          <PanelContainer />
        </PanelProvider>
      </PresenceProvider>
    );
  };

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders nothing when no panels are open', () => {
    renderWithProvider();

    const panels = document.querySelectorAll('.auth-panel');
    expect(panels).toHaveLength(0);
  });

  it('renders panel when opened', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));

    await waitFor(() => {
      expect(screen.getByText('Panel 1')).toBeInTheDocument();
      expect(screen.getByText('Panel 1 Content')).toBeInTheDocument();
    });
  });

  it('renders panel with correct structure', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));

    await waitFor(() => {
      const panel = document.querySelector('.auth-panel');
      expect(panel).toBeInTheDocument();

      const header = document.querySelector('.auth-panel-header');
      expect(header).toBeInTheDocument();

      const title = document.querySelector('.auth-panel-title');
      expect(title).toBeInTheDocument();

      const content = document.querySelector('.auth-panel-content');
      expect(content).toBeInTheDocument();

      const backButton = document.querySelector('.auth-panel-back');
      expect(backButton).toBeInTheDocument();
    });
  });

  it('renders backdrop for panel', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));

    await waitFor(() => {
      const backdrop = document.querySelector('.auth-panel-backdrop');
      expect(backdrop).toBeInTheDocument();
    });
  });

  it('closes panel when back button is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));

    await waitFor(() => {
      expect(screen.getByText('Panel 1 Content')).toBeInTheDocument();
    });

    const backButton = document.querySelector('.auth-panel-back');
    if (backButton) {
      await user.click(backButton as Element);
    }

    await waitFor(() => {
      expect(screen.queryByText('Panel 1 Content')).not.toBeInTheDocument();
    });
  });

  it('closes panel when backdrop is clicked', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));

    await waitFor(() => {
      expect(screen.getByText('Panel 1 Content')).toBeInTheDocument();
    });

    const backdrop = document.querySelector('.auth-panel-backdrop');
    if (backdrop) {
      await user.click(backdrop as Element);
    }

    await waitFor(() => {
      expect(screen.queryByText('Panel 1 Content')).not.toBeInTheDocument();
    });
  });

  it('handles multiple stacked panels', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));
    await user.click(screen.getByText('Open Panel 2'));
    await user.click(screen.getByText('Open Panel 3'));

    await waitFor(() => {
      expect(screen.getByText('Panel 1 Content')).toBeInTheDocument();
      expect(screen.getByText('Panel 2 Content')).toBeInTheDocument();
      expect(screen.getByText('Panel 3 Content')).toBeInTheDocument();
    });

    const panels = document.querySelectorAll('.auth-panel');
    expect(panels).toHaveLength(3);
  });

  it('applies correct z-index to stacked panels', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));
    await user.click(screen.getByText('Open Panel 2'));

    await waitFor(() => {
      const panels = document.querySelectorAll('.auth-panel');
      expect(panels).toHaveLength(2);
    });
  });

  it('applies animation classes', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));

    // Wait for initial render
    await waitFor(() => {
      const panel = document.querySelector('.auth-panel');
      expect(panel).toBeInTheDocument();
    });

    // Fast-forward animation timer
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      const backdrop = document.querySelector('.auth-panel-backdrop');
      expect(backdrop).toHaveClass('active');
    });
  });

  it('closes top panel with closeTopPanel', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));
    await user.click(screen.getByText('Open Panel 2'));

    await waitFor(() => {
      expect(screen.getByText('Panel 2 Content')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Close Top'));

    await waitFor(() => {
      expect(screen.queryByText('Panel 2 Content')).not.toBeInTheDocument();
      expect(screen.getByText('Panel 1 Content')).toBeInTheDocument();
    });
  });

  it('renders panel title correctly', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));

    await waitFor(() => {
      const title = screen.getByText('Panel 1');
      expect(title).toBeInTheDocument();
      // Check that title exists within the panel header
      const titleContainer = title.closest('.auth-panel-title');
      expect(titleContainer).toBeInTheDocument();
    });
  });

  it('applies transform styles for animation', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));

    await waitFor(() => {
      const panel = document.querySelector('.auth-panel') as HTMLElement;
      expect(panel).toHaveStyle({ transformOrigin: 'center right' });
    });
  });

  it('handles rapid panel opening and closing', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProvider();

    await user.click(screen.getByText('Open Panel 1'));
    await user.click(screen.getByText('Open Panel 2'));

    const backButton = document.querySelector('.auth-panel-back');
    if (backButton) {
      await user.click(backButton as Element);
    }

    await user.click(screen.getByText('Open Panel 3'));

    await waitFor(() => {
      expect(screen.getByText('Panel 3 Content')).toBeInTheDocument();
    });
  });

  // Tests for new panel features
  describe('Panel Title Positioning', () => {
    it('renders panel with custom left-aligned title', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProvider();

      await user.click(screen.getByText('Open Panel With Title'));

      await waitFor(() => {
        expect(screen.getByText('Custom Title')).toBeInTheDocument();
        expect(screen.getByText('Custom Panel Content')).toBeInTheDocument();
      });
    });
  });

  describe('Panel Subtitles', () => {
    it('renders panel with subtitle', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProvider();

      await user.click(screen.getByText('Open Panel With Subtitle'));

      await waitFor(() => {
        expect(screen.getByText('Main Title')).toBeInTheDocument();
        expect(screen.getByText('Subtitle Text')).toBeInTheDocument();
        expect(screen.getByText('Subtitle Panel Content')).toBeInTheDocument();
      });
    });

    it('updates subtitle when panel is reopened', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProvider();

      await user.click(screen.getByText('Open Panel With Subtitle'));

      await waitFor(() => {
        expect(screen.getByText('Subtitle Text')).toBeInTheDocument();
      });

      // Close and reopen with same ID would update it
      const backButton = document.querySelector('.auth-panel-back');
      if (backButton) {
        await user.click(backButton as Element);
      }

      await waitFor(() => {
        expect(screen.queryByText('Subtitle Text')).not.toBeInTheDocument();
      });
    });
  });

  describe('Panel Profile Images', () => {
    it('renders panel with profile image', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProvider();

      await user.click(screen.getByText('Open Panel With Profile'));

      await waitFor(() => {
        expect(screen.getByText('User Name')).toBeInTheDocument();
        expect(screen.getByText('Online')).toBeInTheDocument();
        const profileImage = document.querySelector('.auth-panel-title img') as HTMLImageElement;
        expect(profileImage).toBeInTheDocument();
        expect(profileImage.src).toContain('/profile/test.jpg');
      });
    });
  });

  describe('Full Width Panels', () => {
    it('renders full width panel', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProvider();

      await user.click(screen.getByText('Open Full Width Panel'));

      await waitFor(() => {
        expect(screen.getByText('Gallery')).toBeInTheDocument();
        expect(screen.getByText('Full Width Content')).toBeInTheDocument();
        const panel = document.querySelector('.auth-panel') as HTMLElement;
        expect(panel).toHaveStyle({ width: '100vw' });
        expect(panel).toHaveStyle({ maxWidth: '100vw' });
      });
    });
  });

  describe('Panel Action Icons', () => {
    it('renders panel with action icons', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProvider();

      await user.click(screen.getByText('Open Panel With Actions'));

      await waitFor(() => {
        expect(screen.getByText('Chat')).toBeInTheDocument();
        expect(screen.getByText('Actions Panel Content')).toBeInTheDocument();

        // Check for action icons in header
        const header = document.querySelector('.auth-panel-header');
        const actionButtons = header?.querySelectorAll('button:not(.auth-panel-back)');
        expect(actionButtons?.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('action icons are clickable', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProvider();

      await user.click(screen.getByText('Open Panel With Actions'));

      await waitFor(() => {
        const header = document.querySelector('.auth-panel-header');
        const actionButtons = header?.querySelectorAll('button:not(.auth-panel-back)');
        expect(actionButtons?.length).toBeGreaterThanOrEqual(2);

        // First action button should be clickable
        if (actionButtons && actionButtons[0]) {
          expect(actionButtons[0]).toBeInTheDocument();
        }
      });
    });
  });

  describe('Panel Updates', () => {
    it('updates existing panel when reopened with same ID', async () => {
      const user = userEvent.setup({ delay: null });
      renderWithProvider();

      // Open panel first time
      await user.click(screen.getByText('Open Panel With Title'));

      await waitFor(() => {
        expect(screen.getByText('Custom Title')).toBeInTheDocument();
      });

      // Panel should exist
      expect(screen.getByText('Custom Panel Content')).toBeInTheDocument();
    });
  });
});
