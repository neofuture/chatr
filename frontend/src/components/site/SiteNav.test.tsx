import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SiteNav from './SiteNav';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const mockUsePathname = jest.fn(() => '/');
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

jest.mock('@/components/ThemeToggle/ThemeToggle', () => ({
  __esModule: true,
  default: () => <button data-testid="theme-toggle">Toggle</button>,
}));

describe('SiteNav', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  it('renders without crashing', () => {
    render(<SiteNav />);
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders the logo linking to home', () => {
    render(<SiteNav />);
    const logo = screen.getByAltText('Chatr');
    expect(logo).toBeInTheDocument();
    expect(logo.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders all navigation links', () => {
    render(<SiteNav />);
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Features').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Widget').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Pricing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Technology').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Full Overview').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Contact').length).toBeGreaterThanOrEqual(1);
  });

  it('renders ThemeToggle', () => {
    render(<SiteNav />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
  });

  it('does not show mobile menu initially', () => {
    render(<SiteNav />);
    expect(screen.queryAllByText('Home')).toHaveLength(1);
  });

  it('opens mobile menu when hamburger is clicked', async () => {
    const user = userEvent.setup();
    render(<SiteNav />);
    const hamburger = screen.getAllByRole('button').find(b => b.getAttribute('data-testid') !== 'theme-toggle')!;
    await user.click(hamburger);
    // Mobile menu duplicates the links
    expect(screen.getAllByText('Home')).toHaveLength(2);
  });

  it('closes mobile menu when a link is clicked', async () => {
    const user = userEvent.setup();
    render(<SiteNav />);
    const hamburger = screen.getAllByRole('button').find(b => b.getAttribute('data-testid') !== 'theme-toggle')!;
    await user.click(hamburger);
    expect(screen.getAllByText('Home')).toHaveLength(2);
    const mobileLinks = screen.getAllByText('Home');
    await user.click(mobileLinks[1]);
    expect(screen.getAllByText('Home')).toHaveLength(1);
  });

  it('toggles hamburger icon between bars and times', async () => {
    const user = userEvent.setup();
    const { container } = render(<SiteNav />);
    expect(container.querySelector('.fa-bars')).toBeInTheDocument();
    const hamburger = screen.getAllByRole('button').find(b => b.getAttribute('data-testid') !== 'theme-toggle')!;
    await user.click(hamburger);
    expect(container.querySelector('.fa-times')).toBeInTheDocument();
  });

  it('applies active class to the current path link', () => {
    mockUsePathname.mockReturnValue('/features');
    render(<SiteNav />);
    const featuresLink = screen.getAllByText('Features')[0];
    expect(featuresLink.className).toContain('linkActive');
  });

  it('does not apply active class to non-current links', () => {
    mockUsePathname.mockReturnValue('/features');
    render(<SiteNav />);
    const homeLink = screen.getAllByText('Home')[0];
    expect(homeLink.className).not.toContain('linkActive');
  });
});
