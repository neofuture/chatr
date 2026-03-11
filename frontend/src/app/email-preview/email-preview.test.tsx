import { render, screen } from '@testing-library/react';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, ...props }: any) => <a {...props}>{children}</a> }));
jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: jest.fn() }),
  ThemeProvider: ({ children }: any) => children,
}));
jest.mock('@/components/ThemeToggle/ThemeToggle', () => ({ __esModule: true, default: () => <div data-testid="theme-toggle" /> }));
jest.mock('@/components/form-controls/Button/Button', () => ({ __esModule: true, default: (props: any) => <button>{props.children}</button> }));
jest.mock('@/components/form-controls/Input/Input', () => ({ __esModule: true, default: (props: any) => <input {...props} /> }));
jest.mock('@/components/form-controls/Select/Select', () => ({ __esModule: true, default: (props: any) => <select {...props} /> }));

import EmailPreviewPage from './page';

describe('EmailPreviewPage', () => {
  it('should render without crashing', () => {
    render(<EmailPreviewPage />);
    expect(screen.getAllByText(/email/i).length).toBeGreaterThan(0);
  });
});
