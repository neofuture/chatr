import { render } from '@testing-library/react';

jest.mock('next/font/google', () => ({ Inter: () => ({ className: 'inter-mock' }) }));
jest.mock('@/version', () => ({ version: '1.0.0-test' }));
jest.mock('@/components/ClientProviders', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="client-providers">{children}</div>,
}));

import RootLayout from './layout';

describe('RootLayout', () => {
  it('renders children wrapped in ClientProviders', () => {
    const { getByTestId, getByText } = render(
      <RootLayout><span>test child</span></RootLayout>,
      { container: document },
    );
    expect(getByTestId('client-providers')).toBeInTheDocument();
    expect(getByText('test child')).toBeInTheDocument();
  });

  it('includes JSON-LD structured data scripts', () => {
    render(<RootLayout><span>child</span></RootLayout>, { container: document });
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts.length).toBeGreaterThanOrEqual(3);
  });
});
