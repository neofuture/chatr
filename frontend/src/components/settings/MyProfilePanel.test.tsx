import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyProfilePanel from './MyProfilePanel';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', isDark: true, toggleTheme: jest.fn() }),
}));

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: null, connected: false }),
}));

jest.mock('@/lib/socketRPC', () => ({
  socketFirst: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/components/image-manip/ProfileImageUploader/ProfileImageUploader', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-uploader" />,
}));

jest.mock('@/components/image-manip/CoverImageUploader/CoverImageUploader', () => ({
  __esModule: true,
  default: () => <div data-testid="cover-uploader" />,
}));

const TEST_USER = {
  id: 'u1',
  username: '@testuser',
  displayName: 'Test User',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  phoneNumber: '+1234567890',
  gender: 'male',
  createdAt: '2024-01-15T00:00:00Z',
};

describe('MyProfilePanel', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify(TEST_USER));
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders without crashing', () => {
    render(<MyProfilePanel />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('displays the user display name', () => {
    render(<MyProfilePanel />);
    expect(screen.getAllByText('Test User')[0]).toBeInTheDocument();
  });

  it('displays username with @ prefix', () => {
    render(<MyProfilePanel />);
    expect(screen.getAllByText('@testuser').length).toBeGreaterThanOrEqual(1);
  });

  it('renders profile and cover uploaders', () => {
    render(<MyProfilePanel />);
    expect(screen.getByTestId('profile-uploader')).toBeInTheDocument();
    expect(screen.getByTestId('cover-uploader')).toBeInTheDocument();
  });

  it('renders Profile section with editable fields', () => {
    render(<MyProfilePanel />);
    expect(screen.getByText('Display name')).toBeInTheDocument();
    expect(screen.getByText('First name')).toBeInTheDocument();
    expect(screen.getByText('Last name')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
  });

  it('renders Account section with read-only info', () => {
    render(<MyProfilePanel />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows phone number when present', () => {
    render(<MyProfilePanel />);
    expect(screen.getByText('Phone')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
  });

  it('shows joined date when present', () => {
    render(<MyProfilePanel />);
    expect(screen.getByText('Joined')).toBeInTheDocument();
    expect(screen.getByText('January 2024')).toBeInTheDocument();
  });

  it('hides optional fields when not set', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', username: '@testuser' }));
    render(<MyProfilePanel />);
    expect(screen.queryByText('Email')).not.toBeInTheDocument();
    expect(screen.queryByText('Phone')).not.toBeInTheDocument();
    expect(screen.queryByText('Joined')).not.toBeInTheDocument();
  });

  it('enters edit mode on field click', async () => {
    const user = userEvent.setup();
    render(<MyProfilePanel />);
    const displayNameBtn = screen.getAllByText('Test User').find(el => el.closest('button'))?.closest('button');
    expect(displayNameBtn).toBeInTheDocument();
    await user.click(displayNameBtn!);
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
  });

  it('shows gender label "Male" for male value', () => {
    render(<MyProfilePanel />);
    expect(screen.getByText('Male')).toBeInTheDocument();
  });

  it('shows placeholder when field is empty', () => {
    localStorage.setItem('user', JSON.stringify({ id: 'u1', username: '@testuser', displayName: '' }));
    render(<MyProfilePanel />);
    expect(screen.getByText('Add a display name')).toBeInTheDocument();
  });
});
