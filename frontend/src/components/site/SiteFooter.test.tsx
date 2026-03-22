import { render, screen } from '@testing-library/react';
import SiteFooter from './SiteFooter';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('SiteFooter', () => {
  it('renders without crashing', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the brand name', () => {
    render(<SiteFooter />);
    expect(screen.getByText('Chatr')).toBeInTheDocument();
  });

  it('renders product column links', () => {
    render(<SiteFooter />);
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('Support Widget')).toBeInTheDocument();
    expect(screen.getByText('Pricing & Support')).toBeInTheDocument();
    expect(screen.getByText('Full Overview')).toBeInTheDocument();
  });

  it('renders technical column links', () => {
    render(<SiteFooter />);
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('Architecture')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Component Demos')).toBeInTheDocument();
  });

  it('renders get started column links', () => {
    render(<SiteFooter />);
    expect(screen.getByText('Get Started')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    expect(screen.getByText('Contact')).toBeInTheDocument();
    expect(screen.getByText('Open App')).toBeInTheDocument();
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('renders the current year in copyright', () => {
    render(<SiteFooter />);
    const year = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(year))).toBeInTheDocument();
  });

  it('renders stats badges', () => {
    render(<SiteFooter />);
    expect(screen.getByText('lines of code')).toBeInTheDocument();
    expect(screen.getByText('tests')).toBeInTheDocument();
    expect(screen.getByText('days')).toBeInTheDocument();
  });

  it('links have correct hrefs', () => {
    render(<SiteFooter />);
    expect(screen.getByText('Features').closest('a')).toHaveAttribute('href', '/features');
    expect(screen.getByText('Architecture').closest('a')).toHaveAttribute('href', '/technology');
    expect(screen.getByText('GitHub').closest('a')).toHaveAttribute('href', 'https://github.com/neofuture/chatr');
    expect(screen.getByText('Open App').closest('a')).toHaveAttribute('href', '/app');
  });

  it('Create Account is a button that triggers auth panel', () => {
    render(<SiteFooter />);
    const btn = screen.getByText('Create Account');
    expect(btn.tagName).toBe('BUTTON');
  });
});
