import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Panel1Content,
  Panel2Content,
  Panel3Content,
  Panel4Content,
  LeftAlignedPanelContent,
  RightAlignedPanelContent,
  ProfilePanelContent,
  FullWidthPanelContent,
  FullWidthPanel2Content,
  ActionHeaderPanelContent,
  SubtitleTogglePanelContent,
} from './DemoPanels';

const mockOpenPanel = jest.fn();
const mockCloseAllPanels = jest.fn();

jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({
    openPanel: mockOpenPanel,
    closeAllPanels: mockCloseAllPanels,
  }),
}));

describe('DemoPanels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Panel1Content', () => {
    it('renders without crashing', () => {
      render(<Panel1Content />);
      expect(screen.getByText('Panel 1')).toBeInTheDocument();
    });

    it('renders all navigation buttons', () => {
      render(<Panel1Content />);
      expect(screen.getByText('Open Panel 2 ›')).toBeInTheDocument();
      expect(screen.getByText('Open Left-Aligned with Subtitle ›')).toBeInTheDocument();
      expect(screen.getByText('Open Panel with Profile Image ›')).toBeInTheDocument();
      expect(screen.getByText('Open Full Width Panel ›')).toBeInTheDocument();
      expect(screen.getByText('Open Panel with Header Icons ›')).toBeInTheDocument();
      expect(screen.getByText('Open Subtitle Toggle Demo ›')).toBeInTheDocument();
    });

    it('renders demo features list', () => {
      render(<Panel1Content />);
      expect(screen.getByText('Demo Features:')).toBeInTheDocument();
      expect(screen.getByText('All panels slide in from the right')).toBeInTheDocument();
    });

    it('opens Panel 2 when button is clicked', async () => {
      const user = userEvent.setup();
      render(<Panel1Content />);
      await user.click(screen.getByText('Open Panel 2 ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith('Panel 2', expect.anything());
    });

    it('opens left-aligned panel', async () => {
      const user = userEvent.setup();
      render(<Panel1Content />);
      await user.click(screen.getByText('Open Left-Aligned with Subtitle ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith(
        'left-aligned',
        expect.anything(),
        'Profile Settings',
        'left',
        'Configure your account',
      );
    });

    it('opens profile panel', async () => {
      const user = userEvent.setup();
      render(<Panel1Content />);
      await user.click(screen.getByText('Open Panel with Profile Image ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith(
        'profile',
        expect.anything(),
        'John Doe',
        'left',
        'Online',
        '/profile/default-profile.jpg',
      );
    });

    it('opens full width panel', async () => {
      const user = userEvent.setup();
      render(<Panel1Content />);
      await user.click(screen.getByText('Open Full Width Panel ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith(
        'fullwidth',
        expect.anything(),
        'Full Width Panel',
        'center',
        undefined,
        undefined,
        true,
      );
    });

    it('opens action header panel', async () => {
      const user = userEvent.setup();
      render(<Panel1Content />);
      await user.click(screen.getByText('Open Panel with Header Icons ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith(
        'action-header',
        expect.anything(),
        'John Doe',
        'left',
        'Online',
        'use-auth-user',
        false,
        expect.arrayContaining([
          expect.objectContaining({ label: 'Video Call' }),
          expect.objectContaining({ label: 'Audio Call' }),
        ]),
      );
    });

    it('opens subtitle toggle panel', async () => {
      const user = userEvent.setup();
      render(<Panel1Content />);
      await user.click(screen.getByText('Open Subtitle Toggle Demo ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith(
        'subtitle-toggle',
        expect.anything(),
        'Dynamic Title',
        'left',
        'Initial Subtitle',
        'use-auth-user',
        false,
        expect.any(Array),
      );
    });
  });

  describe('Panel2Content', () => {
    it('renders without crashing', () => {
      render(<Panel2Content />);
      expect(screen.getByText('Panel 2')).toBeInTheDocument();
    });

    it('opens Panel 3 on button click', async () => {
      const user = userEvent.setup();
      render(<Panel2Content />);
      await user.click(screen.getByText('Open Panel 3 ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith('Panel 3', expect.anything());
    });

    it('renders try-this hint', () => {
      render(<Panel2Content />);
      expect(screen.getByText(/Click the chevron/)).toBeInTheDocument();
    });
  });

  describe('Panel3Content', () => {
    it('renders without crashing', () => {
      render(<Panel3Content />);
      expect(screen.getByText('Panel 3')).toBeInTheDocument();
    });

    it('opens Panel 4 on button click', async () => {
      const user = userEvent.setup();
      render(<Panel3Content />);
      await user.click(screen.getByText('Open Panel 4 (Final Level) ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith('Panel 4', expect.anything());
    });
  });

  describe('Panel4Content', () => {
    it('renders without crashing', () => {
      render(<Panel4Content />);
      expect(screen.getByText('Panel 4 - Maximum Depth!')).toBeInTheDocument();
    });

    it('closes all panels on button click', async () => {
      const user = userEvent.setup();
      render(<Panel4Content />);
      await user.click(screen.getByText('Close All Panels'));
      expect(mockCloseAllPanels).toHaveBeenCalled();
    });

    it('renders feature list', () => {
      render(<Panel4Content />);
      expect(screen.getByText('Panel System Ready!')).toBeInTheDocument();
      expect(screen.getByText('User profiles')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('LeftAlignedPanelContent', () => {
    it('renders without crashing', () => {
      render(<LeftAlignedPanelContent />);
      expect(screen.getByText('Left-Aligned Title Demo')).toBeInTheDocument();
    });

    it('opens right-aligned panel', async () => {
      const user = userEvent.setup();
      render(<LeftAlignedPanelContent />);
      await user.click(screen.getByText('Open Right-Aligned Panel ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith(
        'right-aligned',
        expect.anything(),
        'User Profile',
        'right',
        'John Doe',
      );
    });
  });

  describe('RightAlignedPanelContent', () => {
    it('renders without crashing', () => {
      render(<RightAlignedPanelContent />);
      expect(screen.getByText('Right-Aligned Title Demo')).toBeInTheDocument();
    });

    it('shows API usage example', () => {
      render(<RightAlignedPanelContent />);
      expect(screen.getByText(/openPanel/)).toBeInTheDocument();
    });
  });

  describe('ProfilePanelContent', () => {
    it('renders without crashing', () => {
      render(<ProfilePanelContent />);
      expect(screen.getByText('Profile Panel Demo')).toBeInTheDocument();
    });

    it('shows profile layout description', () => {
      render(<ProfilePanelContent />);
      expect(screen.getByText('Profile Layout')).toBeInTheDocument();
      expect(screen.getByText('40px circular profile image')).toBeInTheDocument();
    });
  });

  describe('FullWidthPanelContent', () => {
    it('renders without crashing', () => {
      render(<FullWidthPanelContent />);
      expect(screen.getByText('Full Width Panel')).toBeInTheDocument();
    });

    it('renders content blocks grid', () => {
      render(<FullWidthPanelContent />);
      expect(screen.getByText('Content Block 1')).toBeInTheDocument();
      expect(screen.getByText('Content Block 6')).toBeInTheDocument();
    });

    it('opens stacked full width panel', async () => {
      const user = userEvent.setup();
      render(<FullWidthPanelContent />);
      await user.click(screen.getByText('Open Another Full Width Panel ›'));
      expect(mockOpenPanel).toHaveBeenCalledWith(
        'fullwidth2',
        expect.anything(),
        'Another Full Width',
        'center',
        undefined,
        undefined,
        true,
      );
    });
  });

  describe('FullWidthPanel2Content', () => {
    it('renders without crashing', () => {
      render(<FullWidthPanel2Content />);
      expect(screen.getByText('Stacked Full Width Panel')).toBeInTheDocument();
    });

    it('shows feature list', () => {
      render(<FullWidthPanel2Content />);
      expect(screen.getByText('Image galleries')).toBeInTheDocument();
      expect(screen.getByText('Data tables and dashboards')).toBeInTheDocument();
    });
  });

  describe('ActionHeaderPanelContent', () => {
    it('renders without crashing', () => {
      render(<ActionHeaderPanelContent />);
      expect(screen.getByText('Action Header Panel')).toBeInTheDocument();
    });

    it('shows API usage code', () => {
      render(<ActionHeaderPanelContent />);
      expect(screen.getByText(/actionIcons/)).toBeInTheDocument();
    });
  });

  describe('SubtitleTogglePanelContent', () => {
    it('renders without crashing', () => {
      render(<SubtitleTogglePanelContent />);
      expect(screen.getByText('Subtitle Toggle Demo')).toBeInTheDocument();
    });

    it('shows current state', () => {
      render(<SubtitleTogglePanelContent />);
      expect(screen.getByText('Has Subtitle')).toBeInTheDocument();
    });

    it('shows toggle button', () => {
      render(<SubtitleTogglePanelContent />);
      expect(screen.getByText('Remove Subtitle')).toBeInTheDocument();
    });

    it('toggles subtitle on click', async () => {
      const user = userEvent.setup();
      render(<SubtitleTogglePanelContent />);
      await user.click(screen.getByText('Remove Subtitle'));
      expect(mockOpenPanel).toHaveBeenCalledWith(
        'subtitle-toggle',
        expect.anything(),
        'Dynamic Title',
        'left',
        undefined,
        'use-auth-user',
        false,
        expect.any(Array),
      );
    });
  });
});
