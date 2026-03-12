import { render, screen } from '@testing-library/react';
import BottomNav from './BottomNav';

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', isDark: true, toggleTheme: jest.fn() }),
}));
jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ socket: null, connected: false }),
}));
jest.mock('next/navigation', () => ({
  usePathname: () => '/app',
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));
jest.mock('framer-motion', () => {
  const actual = jest.requireActual('framer-motion');
  return {
    ...actual,
    motion: {
      i: (props: any) => <i {...props} />,
      span: (props: any) => <span {...props} />,
      img: (props: any) => <img {...props} />,
      div: (props: any) => <div {...props} />,
    },
  };
});
jest.mock('@/lib/profileImageService', () => ({
  getProfileImageURL: jest.fn().mockResolvedValue(null),
}));

describe('BottomNav', () => {
  beforeEach(() => {
    localStorage.setItem(
      'user',
      JSON.stringify({ id: '1', username: 'testuser', displayName: 'Test User' }),
    );
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders navigation links', () => {
    render(<BottomNav />);
    expect(screen.getByText('CHATS')).toBeInTheDocument();
    expect(screen.getByText('FRIENDS')).toBeInTheDocument();
    expect(screen.getByText('GROUPS')).toBeInTheDocument();
  });

  it('renders link to /app', () => {
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/app');
  });

  it('renders link to /app/friends', () => {
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/app/friends');
  });

  it('renders link to /app/groups', () => {
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/app/groups');
  });

  it('renders link to /app/profile', () => {
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/app/profile');
  });

  it('shows user first name on profile tab', async () => {
    render(<BottomNav />);
    expect(await screen.findByText('TEST')).toBeInTheDocument();
  });

  it('falls back to "ME" when no user in storage', async () => {
    localStorage.clear();
    render(<BottomNav />);
    expect(screen.getByText('ME')).toBeInTheDocument();
  });

  it('renders four navigation items', () => {
    render(<BottomNav />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4);
  });

  it('renders icons for menu items', () => {
    const { container } = render(<BottomNav />);
    expect(container.querySelector('.fa-comments')).toBeInTheDocument();
    expect(container.querySelector('.fa-user-group')).toBeInTheDocument();
    expect(container.querySelector('.fa-users')).toBeInTheDocument();
  });

  it('renders profile image for settings link', () => {
    render(<BottomNav />);
    const imgs = screen.getAllByRole('img');
    expect(imgs.length).toBeGreaterThanOrEqual(1);
  });
});
