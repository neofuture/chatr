import { render, screen } from '@testing-library/react';

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/components/site/SiteNav', () => ({ __esModule: true, default: () => <div data-testid="site-nav" /> }));
jest.mock('@/components/site/SiteFooter', () => ({ __esModule: true, default: () => <div data-testid="site-footer" /> }));
jest.mock('@/components/site/useBodyScroll', () => ({ useBodyScroll: jest.fn() }));

import TechnologyPage from './page';

describe('TechnologyPage', () => {
  it('renders without crashing', () => {
    render(<TechnologyPage />);
    expect(document.body).toBeTruthy();
  });

  it('displays the tech stack', () => {
    render(<TechnologyPage />);
    expect(screen.getByText(/next\.js 16/i)).toBeInTheDocument();
    expect(screen.getByText(/postgresql 16/i)).toBeInTheDocument();
  });
});
