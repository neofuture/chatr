import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PanelProvider } from '@/contexts/PanelContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ForgotPasswordContent } from './ForgotPassword';

// Mock Next.js Image
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

describe('ForgotPassword Component', () => {
  // Suppress act() warnings for async state updates in error/toast scenarios
  const originalError = console.error;

  beforeAll(() => {
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('An update to') || args[0].includes('act(...)'))
      ) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderForgotPassword = () => {
    return render(
      <ToastProvider>
        <PanelProvider>
          <ForgotPasswordContent />
        </PanelProvider>
      </ToastProvider>
    );
  };

  it('renders forgot password form', () => {
    renderForgotPassword();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('renders instruction text', () => {
    renderForgotPassword();

    expect(screen.getByText(/enter your email address/i)).toBeInTheDocument();
  });

  it('renders email input with correct attributes', () => {
    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    expect(emailInput).toHaveAttribute('type', 'email');
    expect(emailInput).toHaveAttribute('required');
    expect(emailInput).toHaveAttribute('placeholder', 'you@example.com');
  });

  it('allows user to type email', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, 'test@example.com');

    expect(emailInput).toHaveValue('test@example.com');
  });

  it('handles successful password reset request', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Reset email sent' }),
    });

    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/forgot-password'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com' }),
        })
      );
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    await user.type(emailInput, 'invalid-email');

    await act(async () => {
      await user.click(submitButton);
    });

    // Should not call API with invalid email
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles server error', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Email not found' }),
    });

    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    await user.type(emailInput, 'notfound@example.com');

    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('disables submit button while loading', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Sending...');
  });

  it('shows loading state', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    expect(screen.getByText('Sending...')).toBeInTheDocument();
  });

  it('renders back to sign in link', () => {
    renderForgotPassword();

    expect(screen.getByText(/remember your password/i)).toBeInTheDocument();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('handles back to sign in click', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPassword();

    const signInButton = screen.getByText('Sign in');
    await user.click(signInButton);

    // Should trigger panel navigation (tested in integration)
  });

  it('renders logo', () => {
    renderForgotPassword();

    const logo = screen.getByAltText(/chatr/i);
    expect(logo).toBeInTheDocument();
  });

  it('validates form before submission', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPassword();

    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    // Try to submit empty form
    await user.click(submitButton);

    // Browser validation should prevent fetch
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    await user.type(emailInput, 'test@example.com');

    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Form should re-enable after error
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('email input has autofocus', () => {
    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    // In React, autoFocus becomes autofocus in the DOM
    expect(document.activeElement).toBe(emailInput);
  });

  it('submit button spans full width', () => {
    renderForgotPassword();

    const submitButton = screen.getByRole('button', { name: /send reset link/i });
    expect(submitButton).toHaveStyle({ width: '100%' });
  });

  it('validates multiple invalid email formats', async () => {
    const user = userEvent.setup({ delay: null });
    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    // Test various invalid formats
    const invalidEmails = ['notanemail', '@example.com', 'test@', 'test'];

    for (const invalidEmail of invalidEmails) {
      await user.clear(emailInput);
      await user.type(emailInput, invalidEmail);

      await act(async () => {
        await user.click(submitButton);
      });

      expect(global.fetch).not.toHaveBeenCalled();
      (global.fetch as jest.Mock).mockClear();
    }
  });

  it('accepts valid email formats', async () => {
    const user = userEvent.setup({ delay: null });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Reset email sent' }),
    });

    renderForgotPassword();

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /send reset link/i });

    await user.type(emailInput, 'valid@example.com');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

