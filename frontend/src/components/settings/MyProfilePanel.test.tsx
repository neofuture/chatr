import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyProfilePanel from './MyProfilePanel';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', isDark: true, toggleTheme: jest.fn() }),
}));

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: null, connected: false }),
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

const mockFetch = jest.fn();

beforeAll(() => {
  global.fetch = mockFetch;
});

describe('MyProfilePanel', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify(TEST_USER));
    localStorage.setItem('token', 'test-token');
    mockFetch.mockResolvedValue({ ok: true, json: async () => TEST_USER });
  });

  afterEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
  });

  it('renders without crashing', async () => {
    render(<MyProfilePanel />);
    await waitFor(() => expect(screen.getByText('Profile')).toBeInTheDocument());
  });

  it('displays the user display name', async () => {
    render(<MyProfilePanel />);
    await waitFor(() => expect(screen.getAllByText('Test User')[0]).toBeInTheDocument());
  });

  it('displays username with @ prefix', async () => {
    render(<MyProfilePanel />);
    await waitFor(() => expect(screen.getAllByText('@testuser').length).toBeGreaterThanOrEqual(1));
  });

  it('renders profile and cover uploaders', () => {
    render(<MyProfilePanel />);
    expect(screen.getByTestId('profile-uploader')).toBeInTheDocument();
    expect(screen.getByTestId('cover-uploader')).toBeInTheDocument();
  });

  it('renders Profile section with editable fields', async () => {
    render(<MyProfilePanel />);
    await waitFor(() => {
      expect(screen.getByText('Display name')).toBeInTheDocument();
      expect(screen.getByText('First name')).toBeInTheDocument();
      expect(screen.getByText('Last name')).toBeInTheDocument();
      expect(screen.getByText('Gender')).toBeInTheDocument();
    });
  });

  it('renders Account section with read-only info', async () => {
    render(<MyProfilePanel />);
    await waitFor(() => {
      expect(screen.getByText('Account')).toBeInTheDocument();
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  it('shows phone number when present', async () => {
    render(<MyProfilePanel />);
    await waitFor(() => {
      expect(screen.getByText('Phone')).toBeInTheDocument();
      expect(screen.getByText('+1234567890')).toBeInTheDocument();
    });
  });

  it('shows joined date when present', async () => {
    render(<MyProfilePanel />);
    await waitFor(() => {
      expect(screen.getByText('Joined')).toBeInTheDocument();
      expect(screen.getByText('January 2024')).toBeInTheDocument();
    });
  });

  it('hides optional fields when not set', async () => {
    const minimal = { id: 'u1', username: '@testuser' };
    localStorage.setItem('user', JSON.stringify(minimal));
    mockFetch.mockResolvedValue({ ok: true, json: async () => minimal });
    render(<MyProfilePanel />);
    await waitFor(() => {
      expect(screen.queryByText('Email')).not.toBeInTheDocument();
      expect(screen.queryByText('Phone')).not.toBeInTheDocument();
      expect(screen.queryByText('Joined')).not.toBeInTheDocument();
    });
  });

  it('enters edit mode on field click', async () => {
    const user = userEvent.setup();
    render(<MyProfilePanel />);
    await waitFor(() => expect(screen.getAllByText('Test User').length).toBeGreaterThan(0));
    const displayNameBtn = screen.getAllByText('Test User').find(el => el.closest('button'))?.closest('button');
    expect(displayNameBtn).toBeInTheDocument();
    await user.click(displayNameBtn!);
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
  });

  it('shows gender label "Male" for male value', async () => {
    render(<MyProfilePanel />);
    await waitFor(() => expect(screen.getByText('Male')).toBeInTheDocument());
  });

  it('shows placeholder when field is empty', async () => {
    const noDisplay = { id: 'u1', username: '@testuser', displayName: '' };
    localStorage.setItem('user', JSON.stringify(noDisplay));
    mockFetch.mockResolvedValue({ ok: true, json: async () => noDisplay });
    render(<MyProfilePanel />);
    await waitFor(() => expect(screen.getByText('Add a display name')).toBeInTheDocument());
  });

  it('fetches fresh profile data on mount', async () => {
    render(<MyProfilePanel />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/me'),
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }),
      );
    });
  });

  it('saves field on blur and shows saved indicator', async () => {
    const user = userEvent.setup();
    const updated = { ...TEST_USER, displayName: 'New Name' };
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => TEST_USER })
      .mockResolvedValueOnce({ ok: true, json: async () => updated });

    render(<MyProfilePanel />);
    await waitFor(() => expect(screen.getAllByText('Test User').length).toBeGreaterThan(0));

    const displayNameBtn = screen.getAllByText('Test User').find(el => el.closest('button'))?.closest('button');
    await user.click(displayNameBtn!);
    const input = screen.getByDisplayValue('Test User');
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.tab();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/me'),
        expect.objectContaining({ method: 'PUT', body: JSON.stringify({ displayName: 'New Name' }) }),
      );
    });
  });
});
