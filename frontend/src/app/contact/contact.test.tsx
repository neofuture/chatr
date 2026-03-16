import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/components/site/SiteNav', () => ({ __esModule: true, default: () => <div data-testid="site-nav" /> }));
jest.mock('@/components/site/SiteFooter', () => ({ __esModule: true, default: () => <div data-testid="site-footer" /> }));
jest.mock('@/components/site/useBodyScroll', () => ({ useBodyScroll: jest.fn() }));

import ContactPage from './page';

describe('ContactPage', () => {
  it('renders without crashing', () => {
    render(<ContactPage />);
    expect(document.body).toBeTruthy();
  });

  it('displays the contact form', () => {
    render(<ContactPage />);
    expect(screen.getByPlaceholderText(/your full name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@company.com/i)).toBeInTheDocument();
  });

  it('displays the hero heading', () => {
    render(<ContactPage />);
    expect(screen.getByText(/get in touch/i)).toBeInTheDocument();
  });
});
