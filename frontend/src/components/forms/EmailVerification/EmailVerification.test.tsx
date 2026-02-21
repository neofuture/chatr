import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/contexts/ToastContext';
import { PanelProvider } from '@/contexts/PanelContext';
import { EmailVerificationContent } from './EmailVerification';

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { priority, ...imgProps } = props;
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...imgProps} />;
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock alert
global.alert = jest.fn();

describe('EmailVerification Component', () => {
  const mockPush = jest.fn();
  const mockUseRouter = require('next/navigation').useRouter;
  const mockProps = {
    userId: 'test-user-id',
    email: 'test@example.com',
  };

  // Suppress console.error for act warnings
  const originalError = console.error;

  beforeAll(() => {
    console.error = jest.fn(); // Suppress all console.error in tests
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    mockPush.mockClear();
    (global.fetch as jest.Mock).mockClear();
    (global.alert as jest.Mock).mockClear();
    Storage.prototype.setItem = jest.fn();
  });

  const renderEmailVerification = () => {
    return render(
      <PanelProvider>
        <ToastProvider>
          <EmailVerificationContent {...mockProps} />
        </ToastProvider>
      </PanelProvider>
    );
  };

  it('renders email verification form', () => {
    renderEmailVerification();

    expect(screen.getByText(/we've sent a 6-digit code to/i)).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify email/i })).toBeInTheDocument();
  });

  it('renders 6 OTP input boxes', () => {
    const { container } = renderEmailVerification();

    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs).toHaveLength(6);
  });

  it('auto-focuses first input', () => {
    const { container } = renderEmailVerification();

    const firstInput = container.querySelector('input[type="text"]');
    expect(document.activeElement).toBe(firstInput);
  });

  it('allows typing single digits in each box', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderEmailVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    await user.type(inputs[0] as Element, '1');
    expect(inputs[0]).toHaveValue('1');
  });

  it('auto-advances to next input after typing', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderEmailVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    await user.type(inputs[0] as Element, '1');

    // Second input should now be focused
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('only accepts numeric digits', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderEmailVerification();

    const firstInput = container.querySelector('input[type="text"]') as HTMLInputElement;

    await user.type(firstInput, 'abc');
    expect(firstInput).toHaveValue('');

    await user.type(firstInput, '5');
    expect(firstInput).toHaveValue('5');
  });

  it('handles backspace navigation', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderEmailVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    // Type in first box
    await user.type(inputs[0] as Element, '1');
    expect(document.activeElement).toBe(inputs[1]);

    // Backspace should go back
    await user.keyboard('{Backspace}');
    expect(document.activeElement).toBe(inputs[0]);
  });

  it('handles arrow key navigation', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderEmailVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    // Focus first input
    (inputs[0] as HTMLElement).focus();

    // Arrow right should move to next
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(inputs[1]);

    // Arrow left should move back
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(inputs[0]);
  });

  it('handles paste of 6-digit code', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderEmailVerification();

    const firstInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    firstInput.focus();

    // Paste 6 digits
    await user.paste('123456');

    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
    expect(inputs[2]).toHaveValue('3');
    expect(inputs[3]).toHaveValue('4');
    expect(inputs[4]).toHaveValue('5');
    expect(inputs[5]).toHaveValue('6');
  });

  it('handles paste with non-numeric characters', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderEmailVerification();

    const firstInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    firstInput.focus();

    // Paste code with letters
    await user.paste('12a34b');

    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
    expect(inputs[2]).toHaveValue('3');
    expect(inputs[3]).toHaveValue('4');
  });

  it('disables submit button when code is incomplete', () => {
    renderEmailVerification();

    const submitButton = screen.getByRole('button', { name: /verify email/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when all digits are entered', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderEmailVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    // Enter all 6 digits
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify email/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('handles successful verification', async () => {
    const user = userEvent.setup({ delay: null });
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com' },
      }),
    });

    const { container } = renderEmailVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    // Enter code
    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify email/i });

    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/verify-email'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ userId: 'test-user-id', code: '123456' }),
        })
      );
    });

    jest.useRealTimers();
  });

  it('stores token and user on successful verification', async () => {
    const user = userEvent.setup({ delay: null });
    const mockSetItem = jest.fn();
    Storage.prototype.setItem = mockSetItem;

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com' },
      }),
    });

    const { container } = renderEmailVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify email/i });

    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(mockSetItem).toHaveBeenCalledWith('token', 'test-token');
      expect(mockSetItem).toHaveBeenCalledWith('user', expect.any(String));
    });
  });

  it('handles verification error', async () => {
    const user = userEvent.setup({ delay: null });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Invalid code' }),
    });

    const { container } = renderEmailVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify email/i });

    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Code should be cleared after error
    await waitFor(() => {
      inputs.forEach(input => {
        expect(input).toHaveValue('');
      });
    });
  });

  it('shows loading state during verification', async () => {
    const user = userEvent.setup({ delay: null });

    (global.fetch as jest.Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 1000))
    );

    const { container } = renderEmailVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify email/i });
    await user.click(submitButton);

    expect(screen.getByText('Verifying...')).toBeInTheDocument();
  });

  it('renders resend button', () => {
    renderEmailVerification();

    expect(screen.getByText(/didn't receive the code/i)).toBeInTheDocument();
    expect(screen.getByText('Resend')).toBeInTheDocument();
  });

  it('handles resend click', async () => {
    const user = userEvent.setup({ delay: null });
    renderEmailVerification();

    const resendButton = screen.getByText('Resend');
    await user.click(resendButton);

    expect(global.alert).toHaveBeenCalledWith('Resend functionality coming soon!');
  });

  it('displays expiration message', () => {
    renderEmailVerification();

    expect(screen.getByText(/code expires in 15 minutes/i)).toBeInTheDocument();
  });

  it('displays spam folder tip', () => {
    renderEmailVerification();

    expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
  });

  it('renders logo', () => {
    renderEmailVerification();

    const logo = screen.getByAltText(/chatr/i);
    expect(logo).toBeInTheDocument();
  });

  it('validates code length before submission', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderEmailVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    // Enter only 3 digits
    for (let i = 0; i < 3; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    // Button should still be disabled
    const submitButton = screen.getByRole('button', { name: /verify email/i });
    expect(submitButton).toBeDisabled();
  });

  it('handles network errors gracefully', async () => {
    const user = userEvent.setup({ delay: null });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { container } = renderEmailVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify email/i });

    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Code should be cleared and first input focused
    await waitFor(() => {
      inputs.forEach(input => {
        expect(input).toHaveValue('');
      });
    });
  });

  it('has correct input attributes', () => {
    const { container } = renderEmailVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    inputs.forEach(input => {
      expect(input).toHaveAttribute('inputMode', 'numeric');
      expect(input).toHaveAttribute('maxLength', '1');
    });
  });
});

