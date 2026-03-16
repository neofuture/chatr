import { render } from '@testing-library/react';

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/components/site/SiteNav', () => ({ __esModule: true, default: () => <div data-testid="site-nav" /> }));
jest.mock('@/components/site/useBodyScroll', () => ({ useBodyScroll: jest.fn() }));
jest.mock('@/components/ThemeToggle/ThemeToggle', () => ({ __esModule: true, default: () => <div data-testid="theme-toggle" /> }));

import ProductPage from './page';

describe('ProductPage', () => {
  it('renders without crashing', () => {
    render(<ProductPage />);
    expect(document.body).toBeTruthy();
  });

  it('displays the executive summary heading', () => {
    render(<ProductPage />);
    expect(document.querySelector('h1, h2')).toBeTruthy();
  });
});
