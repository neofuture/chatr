import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PrivacyPanel from './PrivacyPanel';

const mockSetSetting = jest.fn();
const mockOpenPanel = jest.fn();

jest.mock('@/contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({
    settings: {
      privacyOnlineStatus: 'everyone',
      privacyPhone: 'nobody',
      privacyEmail: 'friends',
      privacyFullName: 'everyone',
      privacyGender: 'nobody',
      privacyJoinedDate: 'everyone',
    },
    setSetting: mockSetSetting,
  }),
}));

jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({ openPanel: mockOpenPanel }),
}));

jest.mock('@/hooks/useFriends', () => ({
  useFriends: () => ({ blocked: mockBlockedList }),
}));

jest.mock('./BlockedUsersPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="blocked-panel" />,
}));

let mockBlockedList: any[] = [];

describe('PrivacyPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBlockedList = [];
  });

  it('renders without crashing', () => {
    render(<PrivacyPanel />);
    expect(screen.getByText('Visibility')).toBeInTheDocument();
  });

  it('renders privacy legend', () => {
    render(<PrivacyPanel />);
    expect(screen.getByText('Everyone')).toBeInTheDocument();
    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.getByText('Only me')).toBeInTheDocument();
  });

  it('renders all privacy rows', () => {
    render(<PrivacyPanel />);
    expect(screen.getByText('Online status')).toBeInTheDocument();
    expect(screen.getByText('Full name')).toBeInTheDocument();
    expect(screen.getByText('Phone number')).toBeInTheDocument();
    expect(screen.getByText('Email address')).toBeInTheDocument();
    expect(screen.getByText('Gender')).toBeInTheDocument();
    expect(screen.getByText('Joined date')).toBeInTheDocument();
  });

  it('renders row descriptions', () => {
    render(<PrivacyPanel />);
    expect(screen.getByText('Who can see when you are online')).toBeInTheDocument();
    expect(screen.getByText('Who can see your phone number')).toBeInTheDocument();
  });

  it('renders Blocking section', () => {
    render(<PrivacyPanel />);
    expect(screen.getByText('Blocking')).toBeInTheDocument();
    expect(screen.getByText('Blocked Users')).toBeInTheDocument();
  });

  it('shows "No blocked users" when list is empty', () => {
    render(<PrivacyPanel />);
    expect(screen.getByText('No blocked users')).toBeInTheDocument();
  });

  it('shows blocked user count when non-empty', () => {
    mockBlockedList = [{ id: '1' }, { id: '2' }];
    render(<PrivacyPanel />);
    expect(screen.getByText('2 blocked users')).toBeInTheDocument();
  });

  it('shows singular form for 1 blocked user', () => {
    mockBlockedList = [{ id: '1' }];
    render(<PrivacyPanel />);
    expect(screen.getByText('1 blocked user')).toBeInTheDocument();
  });

  it('opens blocked users panel on click', async () => {
    const user = userEvent.setup();
    render(<PrivacyPanel />);
    await user.click(screen.getByText('Blocked Users'));
    expect(mockOpenPanel).toHaveBeenCalledWith(
      'blocked-users',
      expect.anything(),
      'Blocked Users',
      'center',
      undefined,
      undefined,
      true,
    );
  });

  it('calls setSetting when privacy button is clicked', async () => {
    const user = userEvent.setup();
    render(<PrivacyPanel />);
    // Each PrivacyRow has 3 buttons (everyone, friends, nobody)
    // Find all buttons with "Only me" title
    const lockButtons = screen.getAllByTitle('Only me');
    await user.click(lockButtons[0]);
    expect(mockSetSetting).toHaveBeenCalledWith('privacyOnlineStatus', 'nobody');
  });
});
