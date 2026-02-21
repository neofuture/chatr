import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AppLayout from './AppLayout';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Logo component
jest.mock('@/components/Logo/Logo', () => {
  return function MockLogo() {
    return <div data-testid="mock-logo">Logo</div>;
  };
});

// Mock getProfileImageURL
jest.mock('@/lib/profileImageService', () => ({
  getProfileImageURL: jest.fn().mockResolvedValue('/profile/profile.jpg'),
}));

describe('AppLayout Component', () => {
  const mockPush = jest.fn();
  const mockUseRouter = require('next/navigation').useRouter;
  const mockUsePathname = require('next/navigation').usePathname;

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });
    mockUsePathname.mockReturnValue('/app');

    // Clear mocks
    mockPush.mockClear();

    // Setup localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return JSON.stringify({ id: '1', username: 'testuser', email: 'test@example.com' });
      return null;
    });
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders layout when user is authenticated', async () => {
    render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Wait for auth check to complete (component has 100ms setTimeout)
    await waitFor(() => {
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('renders navigation with Chats, Groups, Updates, User', async () => {
    const { container } = render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Check we have navigation links
    await waitFor(() => {
      const links = container.querySelectorAll('a');
      expect(links.length).toBeGreaterThanOrEqual(1);

      // Look for the specific text content in links
      const linkTexts = Array.from(links).map(link => link.textContent);
      expect(linkTexts.some(text => text?.includes('Chats'))).toBeTruthy();
      expect(linkTexts.some(text => text?.includes('Groups'))).toBeTruthy();
      expect(linkTexts.some(text => text?.includes('Updates'))).toBeTruthy();
      expect(linkTexts.some(text => text?.includes('User'))).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('renders top header with title', async () => {
    const { container } = render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Should have header with title (defaults to "Chats" for /app path)
    // Find h1 tag which contains the title
    await waitFor(() => {
      const title = container.querySelector('h1');
      expect(title).toBeInTheDocument();
      expect(title?.textContent).toBe('Chats');
    }, { timeout: 3000 });
  });

  it('navigation links have correct hrefs', async () => {
    const { container } = render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      const links = Array.from(container.querySelectorAll('a'));
      const chatsLink = links.find(l => l.textContent?.includes('Chats'));
      const groupsLink = links.find(l => l.textContent?.includes('Groups'));
      const updatesLink = links.find(l => l.textContent?.includes('Updates'));
      const userLink = links.find(l => l.textContent?.includes('User'));

      expect(chatsLink).toHaveAttribute('href', '/app');
      expect(groupsLink).toHaveAttribute('href', '/app/groups');
      expect(updatesLink).toHaveAttribute('href', '/app/updates');
      expect(userLink).toHaveAttribute('href', '/app/settings');
    }, { timeout: 3000 });
  });

  it('redirects to home when no token', async () => {
    Storage.prototype.getItem = jest.fn(() => null);

    render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    }, { timeout: 3000 });
  });

  it('redirects to home when user data is undefined string', async () => {
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return 'undefined';
      return null;
    });

    render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/');
    }, { timeout: 3000 });
  });

  it('shows loading state initially', () => {
    const { container } = render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Should show loading spinner initially
    expect(container.querySelector('.fa-spinner')).toBeInTheDocument();
  });

  it('renders children content after loading', async () => {
    render(
      <AppLayout>
        <div data-testid="child-content">Child Component Content</div>
      </AppLayout>
    );

    await waitFor(() => {
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Child Component Content')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays correct header title based on pathname', async () => {
    mockUsePathname.mockReturnValue('/app/groups');

    const { container } = render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    // Find h1 tag which contains the title
    await waitFor(() => {
      const title = container.querySelector('h1');
      expect(title).toBeInTheDocument();
      expect(title?.textContent).toBe('Groups');
    }, { timeout: 3000 });
  });

  it('has bottom navigation bar structure', async () => {
    const { container } = render(
      <AppLayout>
        <div>Test Content</div>
      </AppLayout>
    );

    // Wait for navigation links to appear directly
    await waitFor(() => {
      const navLinks = container.querySelectorAll('a');
      expect(navLinks.length).toBeGreaterThanOrEqual(1);
    }, { timeout: 3000 });

    // Check for Chats link specifically as a safety check that navigation rendered fully
    await waitFor(() => {
      const chatsLink = Array.from(container.querySelectorAll('a')).find(l => l.textContent?.includes('Chats'));
      expect(chatsLink).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});

