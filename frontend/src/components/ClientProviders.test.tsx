import { render, screen } from '@testing-library/react';
import ClientProviders from './ClientProviders';

jest.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: any) => <div data-testid="theme-provider">{children}</div>,
}));
jest.mock('@/contexts/LogContext', () => ({
  LogProvider: ({ children }: any) => <div data-testid="log-provider">{children}</div>,
}));
jest.mock('@/contexts/UserSettingsContext', () => ({
  UserSettingsProvider: ({ children }: any) => <div data-testid="user-settings-provider">{children}</div>,
}));
jest.mock('@/contexts/WebSocketContext', () => ({
  WebSocketProvider: ({ children }: any) => <div data-testid="ws-provider">{children}</div>,
}));
jest.mock('@/contexts/PresenceContext', () => ({
  PresenceProvider: ({ children }: any) => <div data-testid="presence-provider">{children}</div>,
}));
jest.mock('@/contexts/ToastContext', () => ({
  ToastProvider: ({ children }: any) => <div data-testid="toast-provider">{children}</div>,
}));
jest.mock('@/contexts/PanelContext', () => ({
  PanelProvider: ({ children }: any) => <div data-testid="panel-provider">{children}</div>,
}));
jest.mock('@/contexts/ConfirmationContext', () => ({
  ConfirmationProvider: ({ children }: any) => <div data-testid="confirmation-provider">{children}</div>,
}));
jest.mock('@/contexts/FriendsContext', () => ({
  FriendsProvider: ({ children }: any) => <div data-testid="friends-provider">{children}</div>,
}));
jest.mock('@/contexts/CallContext', () => ({
  CallProvider: ({ children }: any) => <div data-testid="call-provider">{children}</div>,
}));
jest.mock('@/components/panels/PanelContainer/PanelContainer', () => ({
  __esModule: true,
  default: () => <div data-testid="panel-container" />,
}));
jest.mock('@/components/ToastContainer/ToastContainer', () => ({
  __esModule: true,
  default: () => <div data-testid="toast-container" />,
}));
jest.mock('@/components/dialogs/ConfirmationDialog/ConfirmationDialog', () => ({
  __esModule: true,
  default: () => <div data-testid="confirmation-dialog" />,
}));
jest.mock('@/components/RoutePreloader', () => ({
  __esModule: true,
  default: () => <div data-testid="route-preloader" />,
}));
jest.mock('@/components/CallOverlay/CallOverlay', () => ({
  __esModule: true,
  default: () => <div data-testid="call-overlay" />,
}));

describe('ClientProviders', () => {
  it('renders children', () => {
    render(
      <ClientProviders>
        <div data-testid="child">Hello</div>
      </ClientProviders>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('wraps with all context providers', () => {
    render(
      <ClientProviders>
        <span>content</span>
      </ClientProviders>,
    );
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByTestId('log-provider')).toBeInTheDocument();
    expect(screen.getByTestId('user-settings-provider')).toBeInTheDocument();
    expect(screen.getByTestId('ws-provider')).toBeInTheDocument();
    expect(screen.getByTestId('presence-provider')).toBeInTheDocument();
    expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
    expect(screen.getByTestId('panel-provider')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-provider')).toBeInTheDocument();
    expect(screen.getByTestId('friends-provider')).toBeInTheDocument();
    expect(screen.getByTestId('call-provider')).toBeInTheDocument();
  });

  it('renders companion components', () => {
    render(
      <ClientProviders>
        <span>content</span>
      </ClientProviders>,
    );
    expect(screen.getByTestId('panel-container')).toBeInTheDocument();
    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('route-preloader')).toBeInTheDocument();
    expect(screen.getByTestId('call-overlay')).toBeInTheDocument();
  });

  it('nests providers in the correct order (ThemeProvider outermost)', () => {
    const { container } = render(
      <ClientProviders>
        <span>content</span>
      </ClientProviders>,
    );
    const themeProvider = screen.getByTestId('theme-provider');
    const friendsProvider = screen.getByTestId('friends-provider');
    expect(themeProvider.contains(friendsProvider)).toBe(true);
  });
});
