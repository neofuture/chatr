import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('next/image', () => ({ __esModule: true, default: (props: any) => <img {...props} /> }));
jest.mock('@/lib/api', () => ({ api: { post: jest.fn().mockResolvedValue({ data: {} }) } }));

import LoginPage from './page';

describe('LoginPage', () => {
  it('should render the login form', () => {
    render(<LoginPage />);
    expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
  });
});
