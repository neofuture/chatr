import { render, screen } from '@testing-library/react';

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/components/site/SiteNav', () => ({ __esModule: true, default: () => <div data-testid="site-nav" /> }));
jest.mock('@/components/site/SiteFooter', () => ({ __esModule: true, default: () => <div data-testid="site-footer" /> }));
jest.mock('@/components/site/useBodyScroll', () => ({ useBodyScroll: jest.fn() }));

import HomePage from './page';

describe('HomePage', () => {
  it('renders without crashing', () => {
    render(<HomePage />);
    expect(document.body).toBeTruthy();
  });

  it('displays hero heading', () => {
    render(<HomePage />);
    expect(screen.getByText(/collaborate/i)).toBeInTheDocument();
  });

  it('displays call-to-action links', () => {
    render(<HomePage />);
    expect(screen.getAllByText(/view on github/i).length).toBeGreaterThan(0);
  });
});
