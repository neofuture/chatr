import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPanel from './AuthPanel';
import { PanelProvider } from '@/contexts/PanelContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <PanelProvider>
          {component}
        </PanelProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};

describe('AuthPanel', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('should render panel structure when open', () => {
    const { container } = renderWithProviders(
      <AuthPanel isOpen={true} onClose={mockOnClose} initialView="login" />
    );
    const panel = container.querySelector('.auth-panel');
    const backdrop = container.querySelector('.auth-panel-backdrop');
    expect(panel).toBeInTheDocument();
    expect(backdrop).toBeInTheDocument();
  });

  it('should render with login initial view', () => {
    const { container } = renderWithProviders(
      <AuthPanel isOpen={true} onClose={mockOnClose} initialView="login" />
    );
    expect(container.querySelector('.auth-panel')).toBeInTheDocument();
  });

  it('should render with register initial view', () => {
    const { container } = renderWithProviders(
      <AuthPanel isOpen={true} onClose={mockOnClose} initialView="register" />
    );
    expect(container.querySelector('.auth-panel')).toBeInTheDocument();
  });

  it('should have panel header', () => {
    const { container } = renderWithProviders(
      <AuthPanel isOpen={true} onClose={mockOnClose} initialView="login" />
    );
    const header = container.querySelector('.auth-panel-header');
    expect(header).toBeInTheDocument();
  });
});

