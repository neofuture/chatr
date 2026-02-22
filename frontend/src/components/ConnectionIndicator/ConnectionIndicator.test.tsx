import { render, screen } from '@testing-library/react';
import ConnectionIndicator from './ConnectionIndicator';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/contexts/WebSocketContext', () => ({
  useWebSocket: () => ({ connected: false, connecting: false }),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('ConnectionIndicator', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders when disconnected', () => {
    const { container } = render(<ConnectionIndicator />);
    expect(container.firstChild).not.toBeNull();
  });

  it('shows disconnected text', () => {
    render(<ConnectionIndicator />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders without crashing with auth error state', () => {
    localStorage.setItem('token', 'undefined');
    render(<ConnectionIndicator />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });
});
