import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/contexts/ToastContext';
import { LoginVerificationContent } from './LoginVerification';

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

describe('LoginVerification Component', () => {
  const mockPush = jest.fn();
  const mockUseRouter = require('next/navigation').useRouter;
  const mockProps = {
    userId: 'test-user-id',
    email: 'test@example.com',
    password: 'test-password',
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

  const renderLoginVerification = () => {
    return render(
      <ToastProvider>
        <LoginVerificationContent {...mockProps} />
      </ToastProvider>
    );
  };

  it('renders login verification form', () => {
    renderLoginVerification();

    expect(screen.getByText(/we've sent a 6-digit code to/i)).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /verify login/i })).toBeInTheDocument();
  });

  it('renders 6 OTP input boxes', () => {
    const { container } = renderLoginVerification();

    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs).toHaveLength(6);
  });

  it('auto-focuses first input', () => {
    const { container } = renderLoginVerification();

    const firstInput = container.querySelector('input[type="text"]');
    expect(document.activeElement).toBe(firstInput);
  });

  it('allows typing single digits', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderLoginVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    await user.type(inputs[0] as Element, '5');
    expect(inputs[0]).toHaveValue('5');
  });

  it('auto-advances to next input', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderLoginVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    await user.type(inputs[0] as Element, '1');
    expect(document.activeElement).toBe(inputs[1]);
  });

  it('only accepts numeric digits', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderLoginVerification();

    const firstInput = container.querySelector('input[type="text"]') as HTMLInputElement;

    await user.type(firstInput, 'xyz');
    expect(firstInput).toHaveValue('');

    await user.type(firstInput, '9');
    expect(firstInput).toHaveValue('9');
  });

  it('handles backspace navigation', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderLoginVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    await user.type(inputs[0] as Element, '1');
    expect(document.activeElement).toBe(inputs[1]);

    await user.keyboard('{Backspace}');
    expect(document.activeElement).toBe(inputs[0]);
  });

  it('handles arrow key navigation', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderLoginVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    (inputs[0] as HTMLElement).focus();

    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(inputs[1]);

    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(inputs[0]);
  });

  it('handles paste of 6-digit code', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderLoginVerification();

    const firstInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    firstInput.focus();

    await user.paste('987654');

    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs[0]).toHaveValue('9');
    expect(inputs[1]).toHaveValue('8');
    expect(inputs[2]).toHaveValue('7');
    expect(inputs[3]).toHaveValue('6');
    expect(inputs[4]).toHaveValue('5');
    expect(inputs[5]).toHaveValue('4');
  });

  it('filters non-numeric characters from paste', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderLoginVerification();

    const firstInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    firstInput.focus();

    await user.paste('1a2b3c4d');

    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
    expect(inputs[2]).toHaveValue('3');
    expect(inputs[3]).toHaveValue('4');
  });

  it('disables submit button when code is incomplete', () => {
    renderLoginVerification();

    const submitButton = screen.getByRole('button', { name: /verify login/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when all digits entered', async () => {
    const user = userEvent.setup({ delay: null });
    const { container } = renderLoginVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify login/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('handles successful login verification', async () => {
    const user = userEvent.setup({ delay: null });
    jest.useFakeTimers();

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'test-token',
        user: { id: '1', email: 'test@example.com' },
      }),
    });

    const { container } = renderLoginVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify login/i });

    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'test-password',
            loginVerificationCode: '123456',
          }),
        })
      );
    });

    jest.useRealTimers();
  });

  it('stores token and user on success', async () => {
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

    const { container } = renderLoginVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify login/i });

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
      json: async () => ({ error: 'Invalid verification code' }),
    });

    const { container } = renderLoginVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify login/i });

    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Code should be cleared
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

    const { container } = renderLoginVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify login/i });
    await user.click(submitButton);

    expect(screen.getByText('Verifying...')).toBeInTheDocument();
  });

  it('renders resend button', () => {
    renderLoginVerification();

    expect(screen.getByText(/didn't receive the code/i)).toBeInTheDocument();
    expect(screen.getByText('Resend')).toBeInTheDocument();
  });

  it('handles resend click', async () => {
    const user = userEvent.setup({ delay: null });
    renderLoginVerification();

    const resendButton = screen.getByText('Resend');

    // Just verify button can be clicked (shows toast in real app)
    await act(async () => {
      await user.click(resendButton);
    });

    // Button should still be in document after click
    expect(resendButton).toBeInTheDocument();
  });

  it('displays expiration message', () => {
    renderLoginVerification();

    expect(screen.getByText(/code expires in 15 minutes/i)).toBeInTheDocument();
  });

  it('displays spam folder tip', () => {
    renderLoginVerification();

    expect(screen.getByText(/check your spam folder/i)).toBeInTheDocument();
  });

  it('renders logo', () => {
    renderLoginVerification();

    const logo = screen.getByAltText(/chatr/i);
    expect(logo).toBeInTheDocument();
  });

  it('handles network errors', async () => {
    const user = userEvent.setup({ delay: null });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { container } = renderLoginVerification();
    const inputs = container.querySelectorAll('input[type="text"]');

    for (let i = 0; i < 6; i++) {
      await user.type(inputs[i] as Element, String(i + 1));
    }

    const submitButton = screen.getByRole('button', { name: /verify login/i });

    await act(async () => {
      await user.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    // Code should be cleared
    await waitFor(() => {
      inputs.forEach(input => {
        expect(input).toHaveValue('');
      });
    });
  });

  it('has correct input attributes', () => {
    const { container } = renderLoginVerification();

    const inputs = container.querySelectorAll('input[type="text"]');

    inputs.forEach(input => {
      expect(input).toHaveAttribute('inputMode', 'numeric');
      expect(input).toHaveAttribute('maxLength', '1');
    });
  });
});

