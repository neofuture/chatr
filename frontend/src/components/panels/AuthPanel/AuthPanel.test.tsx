import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPanel from './AuthPanel';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ priority, fill, ...props }: any) => <img {...props} />,
}));

const mockOpenPanel = jest.fn();
jest.mock('@/contexts/PanelContext', () => ({
  usePanels: () => ({ openPanel: mockOpenPanel }),
}));

const mockShowToast = jest.fn();
jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('@/components/forms/EmailVerification/EmailVerification', () => ({
  EmailVerificationContent: (props: any) => <div data-testid="email-verification" />,
}));

jest.mock('@/components/forms/ForgotPassword/ForgotPassword', () => ({
  ForgotPasswordContent: () => <div data-testid="forgot-password" />,
}));

const mockLogin = jest.fn();
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    auth: {
      login: (...args: any[]) => mockLogin(...args),
    },
  },
  getApiBase: () => 'http://localhost:3001',
}));

const defaultProps = {
  isOpen: true,
  onClose: jest.fn(),
  initialView: 'login' as const,
};

describe('AuthPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<AuthPanel {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders login form when initialView is login', async () => {
    render(<AuthPanel {...defaultProps} />);
    // "Sign In" appears both in title and button
    await waitFor(() => {
      expect(screen.getAllByText('Sign In').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByPlaceholderText('you@example.com or @username')).toBeInTheDocument();
  });

  it('renders register form when initialView is register', async () => {
    render(<AuthPanel {...defaultProps} initialView="register" />);
    await waitFor(() => {
      expect(screen.getByText('Create Account')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
  });

  it('renders the logo', async () => {
    render(<AuthPanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByAltText('Chatr')).toBeInTheDocument();
    });
  });

  it('has email and password fields in login view', async () => {
    render(<AuthPanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Email or Username')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('you@example.com or @username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<AuthPanel {...defaultProps} />);
    await waitFor(() => screen.getByPlaceholderText('••••••••'));
    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleBtns = screen.getAllByRole('button').filter(b => b.classList.contains('password-toggle'));
    await user.click(toggleBtns[0]);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('shows verification method toggle with Email default', async () => {
    render(<AuthPanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Email')).toBeInTheDocument();
    });
    expect(screen.getByText('SMS')).toBeInTheDocument();
  });

  it('shows Forgot password link', async () => {
    render(<AuthPanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });
  });

  it('shows Create account link in login view', async () => {
    render(<AuthPanel {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('Create account')).toBeInTheDocument();
    });
  });

  it('shows Sign in link in register view', async () => {
    render(<AuthPanel {...defaultProps} initialView="register" />);
    await waitFor(() => {
      expect(screen.getByText('Sign in')).toBeInTheDocument();
    });
  });

  it('calls onClose when backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const { container } = render(<AuthPanel {...defaultProps} onClose={onClose} />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com or @username'));
    const backdrop = container.querySelector('.auth-panel-backdrop');
    if (backdrop) await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when back button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<AuthPanel {...defaultProps} onClose={onClose} />);
    await waitFor(() => screen.getByText('‹'));
    await user.click(screen.getByText('‹'));
    expect(onClose).toHaveBeenCalled();
  });

  it('submits login form and redirects on success', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockLogin.mockResolvedValue({
      token: 'test-token',
      user: { id: 'u1', username: 'alice' },
    });
    render(<AuthPanel {...defaultProps} onClose={onClose} />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com or @username'));

    await user.type(screen.getByPlaceholderText('you@example.com or @username'), 'alice@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'Password1!');

    const submitBtn = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('alice@test.com', 'Password1!', undefined, 'email');
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Login successful!', 'success');
    });

    expect(localStorage.getItem('token')).toBe('test-token');
  });

  it('shows error message on login failure', async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    render(<AuthPanel {...defaultProps} />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com or @username'));

    await user.type(screen.getByPlaceholderText('you@example.com or @username'), 'bad@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpwd');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('opens email verification when requiresEmailVerification', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockLogin.mockResolvedValue({ requiresEmailVerification: true, userId: 'u1' });
    render(<AuthPanel {...defaultProps} onClose={onClose} />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com or @username'));

    await user.type(screen.getByPlaceholderText('you@example.com or @username'), 'a@b.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass12');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Please verify your email first', 'warning');
      expect(mockOpenPanel).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('opens login verification when requiresLoginVerification', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    mockLogin.mockResolvedValue({ requiresLoginVerification: true, userId: 'u1', verificationMethod: 'sms' });
    render(<AuthPanel {...defaultProps} onClose={onClose} />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com or @username'));

    await user.type(screen.getByPlaceholderText('you@example.com or @username'), 'a@b.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass12');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Please check your phone for the verification code', 'info');
    });
  });

  it('disables submit button while loading', async () => {
    const user = userEvent.setup();
    let resolveLogin: (v: any) => void;
    mockLogin.mockReturnValue(new Promise(r => { resolveLogin = r; }));
    render(<AuthPanel {...defaultProps} />);
    await waitFor(() => screen.getByPlaceholderText('you@example.com or @username'));

    await user.type(screen.getByPlaceholderText('you@example.com or @username'), 'a@b.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'pass12');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument();
    });
    expect(screen.getByText('Signing in...').closest('button')).toBeDisabled();

    await act(async () => {
      resolveLogin!({ token: 't', user: { id: 'u1', username: 'a' } });
    });
  });

  describe('register form', () => {
    const regProps = { ...defaultProps, initialView: 'register' as const };

    beforeEach(() => {
      jest.useFakeTimers();
      global.fetch = jest.fn().mockResolvedValue({
        json: () => Promise.resolve({ available: true }),
      }) as any;
    });

    afterEach(async () => {
      await act(async () => { jest.runAllTimers(); });
      jest.useRealTimers();
    });

    it('renders all registration fields', async () => {
      render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByPlaceholderText('First name'));
      expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/\+447911123456/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText('username')).toBeInTheDocument();
    });

    it('auto-populates username from name', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByPlaceholderText('First name'));
      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
      expect(screen.getByPlaceholderText('username')).toHaveValue('johndoe');
    });

    it('shows gender dropdown with options', async () => {
      render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByText('Male'));
      expect(screen.getByText('Female')).toBeInTheDocument();
      expect(screen.getByText('Non-binary')).toBeInTheDocument();
    });

    it('validates empty first name on submit', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByPlaceholderText('First name'));

      // Fill all required fields with space for first name (blank value, passes HTML5 required)
      await user.type(screen.getByPlaceholderText('First name'), ' ');
      await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
      await user.type(screen.getByPlaceholderText('you@example.com'), 't@t.com');
      await user.type(screen.getByPlaceholderText(/\+447911123456/), '07911123456');
      await user.type(screen.getByPlaceholderText('username'), 'testuser');
      const pwdInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(pwdInputs[0], 'Test1!aaa');
      await user.type(pwdInputs[1], 'Test1!aaa');
      await user.click(screen.getByRole('button', { name: 'Sign Up' }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Please enter your first name', 'warning');
      });
    });

    it('validates email format on submit', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByPlaceholderText('First name'));

      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
      // "x@y" passes HTML5 email validation but fails our /^[^\s@]+@[^\s@]+\.[^\s@]+$/ regex
      await user.type(screen.getByPlaceholderText('you@example.com'), 'x@y');
      await user.type(screen.getByPlaceholderText(/\+447911123456/), '07911123456');
      await user.type(screen.getByPlaceholderText('username'), 'testuser');
      const pwdInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(pwdInputs[0], 'Test1!aaa');
      await user.type(pwdInputs[1], 'Test1!aaa');
      await user.click(screen.getByRole('button', { name: 'Sign Up' }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('valid email'),
          'warning',
        );
      });
    });

    it('validates phone number on submit', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByPlaceholderText('First name'));

      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
      await user.type(screen.getByPlaceholderText('you@example.com'), 'john@test.com');
      await user.type(screen.getByPlaceholderText(/\+447911123456/), '123');
      await user.clear(screen.getByPlaceholderText('username'));
      await user.type(screen.getByPlaceholderText('username'), 'johndoe');

      const pwdInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(pwdInputs[0], 'Test1!aaa');
      await user.type(pwdInputs[1], 'Test1!aaa');
      await user.click(screen.getByRole('button', { name: 'Sign Up' }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('valid UK mobile'),
          'warning',
        );
      });
    });

    it('validates password requirements on submit', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByPlaceholderText('First name'));

      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
      await user.type(screen.getByPlaceholderText('you@example.com'), 'john@test.com');
      await user.type(screen.getByPlaceholderText(/\+447911123456/), '07911123456');
      await user.clear(screen.getByPlaceholderText('username'));
      await user.type(screen.getByPlaceholderText('username'), 'johndoe');
      await act(async () => { jest.advanceTimersByTime(900); });

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'weak');
      await user.type(passwordInputs[1], 'weak');
      await user.click(screen.getByRole('button', { name: 'Sign Up' }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          expect.stringContaining('capital letter'),
          'warning',
        );
      });
    });

    it('validates password match on submit', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByPlaceholderText('First name'));

      await user.type(screen.getByPlaceholderText('First name'), 'John');
      await user.type(screen.getByPlaceholderText('Last name'), 'Doe');
      await user.type(screen.getByPlaceholderText('you@example.com'), 'john@test.com');
      await user.type(screen.getByPlaceholderText(/\+447911123456/), '07911123456');
      await user.clear(screen.getByPlaceholderText('username'));
      await user.type(screen.getByPlaceholderText('username'), 'johndoe');
      await act(async () => { jest.advanceTimersByTime(900); });

      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'StrongPass1!');
      await user.type(passwordInputs[1], 'DifferentPass1!');
      await user.click(screen.getByRole('button', { name: 'Sign Up' }));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith('Passwords do not match', 'warning');
      });
    });

    it('shows password strength bar when typing password', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { container } = render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByPlaceholderText('First name'));
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'Test1!');

      await waitFor(() => {
        const strengthBar = container.querySelector('[class*="strengthBar"]');
        expect(strengthBar).toBeInTheDocument();
      });
    });

    it('shows "Passwords do not match" hint when passwords differ', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<AuthPanel {...regProps} />);
      await waitFor(() => screen.getByPlaceholderText('First name'));
      const passwordInputs = screen.getAllByPlaceholderText('••••••••');
      await user.type(passwordInputs[0], 'Pass1!aa');
      await user.type(passwordInputs[1], 'Different');
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('opens forgot password panel', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<AuthPanel {...defaultProps} onClose={onClose} />);
    await waitFor(() => screen.getByText('Forgot password?'));
    await user.click(screen.getByText('Forgot password?'));
    expect(onClose).toHaveBeenCalled();
  });
});
