import { render, screen } from '@testing-library/react';

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/components/site/SiteNav', () => ({ __esModule: true, default: () => <div data-testid="site-nav" /> }));
jest.mock('@/components/site/SiteFooter', () => ({ __esModule: true, default: () => <div data-testid="site-footer" /> }));
jest.mock('@/components/site/useBodyScroll', () => ({ useBodyScroll: jest.fn() }));

import FeaturesPage from './page';

describe('FeaturesPage', () => {
  it('renders without crashing', () => {
    render(<FeaturesPage />);
    expect(document.body).toBeTruthy();
  });

  it('displays the hero heading', () => {
    render(<FeaturesPage />);
    expect(screen.getByText(/messaging platform/i)).toBeInTheDocument();
  });

  it('displays feature sections', () => {
    render(<FeaturesPage />);
    expect(screen.getAllByText(/seven message types/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/real-time awareness/i).length).toBeGreaterThan(0);
  });
});
