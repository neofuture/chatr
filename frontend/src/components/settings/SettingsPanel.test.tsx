import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPanel from './SettingsPanel';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', isDark: true, toggleTheme: jest.fn() }),
}));

jest.mock('@/contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({
    settings: { ghostTypingEnabled: false, showOnlineStatus: true },
    setSetting: jest.fn(),
  }),
}));

jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({ openPanel: jest.fn(), closeTopPanel: jest.fn() }),
}));

jest.mock('@/contexts/LogContext', () => ({
  useLog: () => ({ logs: [] }),
}));

jest.mock('@/components/image-manip/ProfileImageUploader/ProfileImageUploader', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-uploader" />,
}));

jest.mock('@/components/image-manip/CoverImageUploader/CoverImageUploader', () => ({
  __esModule: true,
  default: () => <div data-testid="cover-uploader" />,
}));

jest.mock('@/components/LogViewerPanel/LogViewerPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="log-viewer" />,
}));

jest.mock('./PrivacyPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="privacy-panel" />,
}));

describe('SettingsPanel', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'testuser', displayName: 'Test User' }));
    localStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders Settings heading', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Manage your preferences')).toBeInTheDocument();
  });

  it('renders Profile section with gender select', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
  });

  it('renders Appearance section with dark mode toggle', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('renders dark mode toggle as switch', () => {
    render(<SettingsPanel />);
    const toggle = screen.getAllByRole('switch')[0];
    expect(toggle).toBeInTheDocument();
  });

  it('renders Messaging section with ghost typing toggle', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Messaging')).toBeInTheDocument();
    expect(screen.getByText('Ghost typing')).toBeInTheDocument();
  });

  it('renders Privacy section', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Online status, profile visibility, blocked users')).toBeInTheDocument();
  });

  it('renders About section with app version', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('App version')).toBeInTheDocument();
  });

  it('renders Developer section with system logs', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('System logs')).toBeInTheDocument();
  });

  it('renders Sign out button', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('renders profile and cover uploaders', () => {
    render(<SettingsPanel />);
    expect(screen.getByTestId('profile-uploader')).toBeInTheDocument();
    expect(screen.getByTestId('cover-uploader')).toBeInTheDocument();
  });

  it('shows "No events recorded" when no logs', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('No events recorded')).toBeInTheDocument();
  });
});
