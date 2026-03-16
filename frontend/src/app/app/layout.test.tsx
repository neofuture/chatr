import { render } from '@testing-library/react';

let mockPathname = '/app';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('@/components/MobileLayout/MobileLayout', () => ({
  __esModule: true,
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="mobile-layout" data-title={title}>{children}</div>
  ),
}));

import AppLayout from './layout';

describe('AppLayout', () => {
  beforeEach(() => { mockPathname = '/app'; });

  it('renders children inside MobileLayout', () => {
    const { getByTestId, getByText } = render(
      <AppLayout><span>child content</span></AppLayout>
    );
    expect(getByTestId('mobile-layout')).toBeInTheDocument();
    expect(getByText('child content')).toBeInTheDocument();
  });

  it('sets title to "Chats" for /app path', () => {
    const { getByTestId } = render(<AppLayout><div /></AppLayout>);
    expect(getByTestId('mobile-layout')).toHaveAttribute('data-title', 'Chats');
  });

  it('sets title to "Friends" for /app/friends path', () => {
    mockPathname = '/app/friends';
    const { getByTestId } = render(<AppLayout><div /></AppLayout>);
    expect(getByTestId('mobile-layout')).toHaveAttribute('data-title', 'Friends');
  });

  it('sets title to "Groups" for /app/groups path', () => {
    mockPathname = '/app/groups';
    const { getByTestId } = render(<AppLayout><div /></AppLayout>);
    expect(getByTestId('mobile-layout')).toHaveAttribute('data-title', 'Groups');
  });

  it('sets title to "Updates" for /app/updates path', () => {
    mockPathname = '/app/updates';
    const { getByTestId } = render(<AppLayout><div /></AppLayout>);
    expect(getByTestId('mobile-layout')).toHaveAttribute('data-title', 'Updates');
  });

  it('sets title to "Test Lab" for /app/test path', () => {
    mockPathname = '/app/test';
    const { getByTestId } = render(<AppLayout><div /></AppLayout>);
    expect(getByTestId('mobile-layout')).toHaveAttribute('data-title', 'Test Lab');
  });

  it('sets title to "Profile" for /app/profile path', () => {
    mockPathname = '/app/profile';
    const { getByTestId } = render(<AppLayout><div /></AppLayout>);
    expect(getByTestId('mobile-layout')).toHaveAttribute('data-title', 'Profile');
  });

  it('sets title to "Settings" for /app/settings path', () => {
    mockPathname = '/app/settings';
    const { getByTestId } = render(<AppLayout><div /></AppLayout>);
    expect(getByTestId('mobile-layout')).toHaveAttribute('data-title', 'Settings');
  });
});
