import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/components/site/SiteNav', () => ({ __esModule: true, default: () => <div data-testid="site-nav" /> }));
jest.mock('@/components/site/SiteFooter', () => ({ __esModule: true, default: () => <div data-testid="site-footer" /> }));
jest.mock('@/components/site/useBodyScroll', () => ({ useBodyScroll: jest.fn() }));

import PricingPage from './page';

describe('PricingPage', () => {
  it('renders without crashing', () => {
    render(<PricingPage />);
    expect(document.body).toBeTruthy();
  });

  it('displays the hero heading', () => {
    render(<PricingPage />);
    expect(screen.getByText('Pricing & Support')).toBeInTheDocument();
  });

  it('displays the three pricing options', () => {
    render(<PricingPage />);
    expect(screen.getByText('Intercom')).toBeInTheDocument();
    expect(screen.getByText('Chatr')).toBeInTheDocument();
    expect(screen.getByText('Build from Scratch')).toBeInTheDocument();
  });
});
