import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelProvider } from '@/contexts/PanelContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LoginFormContent } from './LoginForm';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // Filter out Next.js specific props that aren't valid HTML attributes
    const { priority, ...imgProps } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...imgProps} />;
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('LoginForm Component', () => {
  const mockPush = jest.fn();
  const mockUseRouter = require('next/navigation').useRouter;

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    mockPush.mockClear();
    (global.fetch as jest.Mock).mockClear();

    Storage.prototype.setItem = jest.fn();
  });

  const renderLoginForm = () => {
    return render(
      <ToastProvider>
        <PanelProvider>
          <LoginFormContent />
        </PanelProvider>
      </ToastProvider>
    );
  };

  it('renders login form', () => {
    renderLoginForm();

    expect(screen.getByLabelText(/email or username/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders email input', () => {
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email or username/i);
    expect(emailInput).toHaveAttribute('type', 'text');
    expect(emailInput).toHaveAttribute('required');
  });

  it('renders password input', () => {
    renderLoginForm();

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('allows user to type email', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const emailInput = screen.getByLabelText(/email or username/i);
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('allows user to type password', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, 'password123');

    expect(passwordInput).toHaveValue('password123');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Find and click the password toggle button
    const toggleButton = screen.getByLabelText(/show password/i);
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');

    const hideButton = screen.getByLabelText(/hide password/i);
    await user.click(hideButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('handles successful login', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'mock-token',
        user: { id: '1', username: 'testuser', email: 'test@example.com' },
      }),
    });

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123',
          }),
        })
      );
    });
  });

  it('handles login error', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid credentials' }),
    });

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('disables submit button while loading', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
  });

  it('renders forgot password link', () => {
    renderLoginForm();

    const forgotPasswordButton = screen.getByText(/forgot password/i);
    expect(forgotPasswordButton).toBeInTheDocument();
  });

  it('handles forgot password click', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const forgotPasswordButton = screen.getByText(/forgot password/i);
    await user.click(forgotPasswordButton);

    // Should trigger panel navigation
    // Actual panel opening tested in integration tests
  });

  it('renders logo', () => {
    renderLoginForm();

    const logo = screen.getByAltText(/chatr/i);
    expect(logo).toBeInTheDocument();
  });

  it('validates form before submission', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Try to submit empty form
    await user.click(submitButton);

    // Browser validation should prevent fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('stores token on successful login', async () => {
    const user = userEvent.setup();
    const mockSetItem = jest.fn();
    Storage.prototype.setItem = mockSetItem;

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'mock-token',
        user: { id: '1', username: 'testuser', email: 'test@example.com' },
      }),
    });

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith('token', 'mock-token');
      expect(mockSetItem).toHaveBeenCalledWith('user', expect.any(String));
    });
  });

  it('redirects to app on successful login', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'mock-token',
        user: { id: '1', username: 'testuser', email: 'test@example.com' },
      }),
    });

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Fast forward the redirect timer
    act(() => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/app');
    });

    jest.useRealTimers();
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup();
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    renderLoginForm();

    const emailInput = screen.getByLabelText(/email or username/i);
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Form should re-enable after error
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});

