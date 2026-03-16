import { render, screen } from '@testing-library/react';

jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/components/site/SiteNav', () => ({ __esModule: true, default: () => <div data-testid="site-nav" /> }));
jest.mock('@/components/site/SiteFooter', () => ({ __esModule: true, default: () => <div data-testid="site-footer" /> }));
jest.mock('@/components/site/useBodyScroll', () => ({ useBodyScroll: jest.fn() }));

import WidgetPage from './page';

describe('WidgetPage', () => {
  it('renders without crashing', () => {
    render(<WidgetPage />);
    expect(document.body).toBeTruthy();
  });

  it('displays the hero heading', () => {
    render(<WidgetPage />);
    expect(screen.getByText(/one line of code/i)).toBeInTheDocument();
  });

  it('displays the embeddable widget tag', () => {
    render(<WidgetPage />);
    expect(screen.getByText(/embeddable widget/i)).toBeInTheDocument();
  });
});
