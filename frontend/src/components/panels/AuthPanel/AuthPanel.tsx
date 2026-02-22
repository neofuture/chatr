'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePanels } from '@/contexts/PanelContext';
import { useToast } from '@/contexts/ToastContext';
import { EmailVerificationContent } from '@/components/forms/EmailVerification/EmailVerification';
import { ForgotPasswordContent } from '@/components/forms/ForgotPassword/ForgotPassword';
import api from '@/lib/api';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

interface AuthPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialView: 'login' | 'register';
}

export default function AuthPanel({ isOpen, onClose, initialView }: AuthPanelProps) {
  const router = useRouter();
  const { openPanel } = usePanels();
  const { showToast } = useToast();
  const [view, setView] = useState<'login' | 'register'>(initialView);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextView, setNextView] = useState<'login' | 'register' | null>(null);

  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'email' | 'sms'>('sms'); // Default to SMS

  // Register state
  const [regEmail, setRegEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [username, setUsername] = useState('');
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [emailValid, setEmailValid] = useState(true);
  const [phoneValid, setPhoneValid] = useState(true);

  // Common state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameSubmitError, setUsernameSubmitError] = useState(false);

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength += 25;
    return strength;
  };

  const passwordStrength = calculatePasswordStrength(regPassword);

  const getStrengthColor = () => {
    if (passwordStrength <= 25) return 'bg-red-500';
    if (passwordStrength <= 50) return 'bg-orange-500';
    if (passwordStrength <= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 25) return 'Weak';
    if (passwordStrength <= 50) return 'Fair';
    if (passwordStrength <= 75) return 'Good';
    return 'Strong';
  };

  const passwordMeetsRequirements = (pwd: string): boolean => {
    const hasMinLength = pwd.length >= 8;
    const hasCapital = /[A-Z]/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    return hasMinLength && hasCapital && hasSpecial;
  };

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone number validation (UK mobile format)
  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');

    // UK mobile formats:
    // +447... (+ and 12-14 digits: +44 + 10-12 mobile digits)
    // 07... (11 digits: 07 + 9 digits)
    if (cleaned.startsWith('+44')) {
      // Must start with +44, total length: + and 12-14 digits
      const totalLength = cleaned.length;
      return totalLength >= 13 && totalLength <= 15; // +447xxxxxxxxx (13) to +447xxxxxxxxxxxx (15)
    } else if (cleaned.startsWith('07')) {
      // Must be exactly 11 digits
      return cleaned.length === 11;
    } else {
      // Invalid: Must start with +44 or 07
      return false;
    }
  };

  // Handle name changes and auto-populate username from first+last name
  const handleFirstNameChange = (val: string) => {
    setFirstName(val);
    if (!usernameManuallyEdited) {
      setUsername(`${val}${lastName}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20).toLowerCase());
    }
  };

  const handleLastNameChange = (val: string) => {
    setLastName(val);
    if (!usernameManuallyEdited) {
      setUsername(`${firstName}${val}`.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20).toLowerCase());
    }
  };

  // Handle email change
  const handleEmailChange = (newEmail: string) => {
    setRegEmail(newEmail);
    setEmailValid(true);
  };

  const handleUsernameChange = (newUsername: string) => {
    setUsernameManuallyEdited(true);
    setUsername(newUsername.replace(/\s/g, '').toLowerCase());
  };

  const isUsernameInvalid = () => {
    if (!username) return false;
    return username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setUsername(suggestion);
    setUsernameManuallyEdited(true);
    setUsernameSuggestions([]); // Clear suggestions after selection
  };

  // Check username availability (debounced)
  useEffect(() => {
    if (username.length < 3 || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      setUsernameSuggestions([]); // Clear previous suggestions
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/check-username?username=${encodeURIComponent(username)}`
        );
        const data = await response.json();
        setUsernameAvailable(data.available);

        // If username is taken, fetch suggestions
        if (!data.available) {
          const suggestResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/users/suggest-username?username=${encodeURIComponent(username)}`
          );
          const suggestData = await suggestResponse.json();
          if (suggestData.suggestions) {
            setUsernameSuggestions(suggestData.suggestions);
          }
        }
      } catch (err) {
        console.error('Username check failed:', err);
      } finally {
        setUsernameChecking(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [username]);

  // Handle panel open/close animation and state reset
  useEffect(() => {
    if (isOpen) {
      // Mount the component
      setShouldRender(true);

      // Reset form state
      setError('');
      setEmail('');
      setPassword('');
      setShowPassword(false);

      // Set view based on initialView
      setView(initialView);

      // Trigger slide-in animation after a small delay
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);

      return () => clearTimeout(timer);
    } else {
      // Trigger slide-out animation
      setIsAnimating(false);

      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [isOpen, initialView]);

  // Handle view transitions
  useEffect(() => {
    if (isTransitioning && nextView) {
      // Wait for slide-out to complete
      const timer = setTimeout(() => {
        // Switch view
        setView(nextView);
        setNextView(null);
        setIsTransitioning(false);

        // Reset ALL form fields based on which view we're switching to
        if (nextView === 'login') {
          // Reset login form
          setEmail('');
          setPassword('');
          setShowPassword(false);
        } else {
          // Reset registration form
          setRegEmail('');
          setFirstName('');
          setLastName('');
          setUsername('');
          setUsernameManuallyEdited(false);
          setRegPassword('');
          setConfirmPassword('');
          setShowRegPassword(false);
          setShowConfirmPassword(false);
          setUsernameAvailable(null);
          setEmailValid(true);
        }
        setError('');

        // Slide in new panel
        setTimeout(() => {
          setIsAnimating(true);
        }, 10);
      }, 300); // Match CSS transition duration

      return () => clearTimeout(timer);
    }
  }, [isTransitioning, nextView]);

  const handleViewSwitch = (newView: 'login' | 'register') => {
    if (newView === view) return;

    // Start transition
    setNextView(newView);
    setIsTransitioning(true);
    setIsAnimating(false); // Slide out current panel
  };

  if (!shouldRender) return null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.auth.login(email, password, undefined, verificationMethod);

      // Check if email verification is required
      if (data.requiresEmailVerification) {
        showToast('Please verify your email first', 'warning');
        // Open email verification panel
        openPanel(
          'email-verification',
          <EmailVerificationContent userId={data.userId} verificationType="email" />,
          'Verify Email',
          'center'
        );
        onClose();
        setLoading(false);
        return;
      }

      // Check if phone verification is required
      if (data.requiresPhoneVerification) {
        showToast('Please verify your phone number first', 'warning');
        // Open phone verification panel
        openPanel(
          'phone-verification',
          <EmailVerificationContent userId={data.userId} verificationType="phone" />,
          'Verify Phone Number',
          'center'
        );
        onClose();
        setLoading(false);
        return;
      }

      // Check if login verification is required
      if (data.requiresLoginVerification) {
        const message = data.verificationMethod === 'sms'
          ? 'Please check your phone for the verification code'
          : 'Please check your email for the verification code';
        showToast(message, 'info');

        // Temporarily store email and password for verification step
        // This is needed because the backend requires them when verifying the code
        localStorage.setItem('temp_login_email', email);
        localStorage.setItem('temp_login_password', password);

        // Open login verification panel
        openPanel(
          'login-verification',
          <EmailVerificationContent userId={data.userId} verificationType="login" />,
          'Verify Login',
          'center'
        );
        onClose(); // Close the login panel
        setLoading(false);
        return;
      }

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        showToast('2FA required - please use /login page for 2FA authentication', 'info');
        setLoading(false);
        return;
      }

      // Check if email verification is required
      if (data.requiresEmailVerification) {
        showToast('Please verify your email first', 'warning');
        setLoading(false);
        return;
      }

      // Successful login - must have token and user
      if (!data.token || !data.user) {
        throw new Error('Invalid login response from server');
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      console.log('[AuthPanel] Stored auth data:', {
        hasToken: !!data.token,
        user: data.user.username
      });

      showToast('Login successful!', 'success');

      // Clear login form
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setVerificationMethod('sms');

      // Close panel
      onClose();

      // Small delay to ensure localStorage is written before redirect
      setTimeout(() => {
        console.log('[AuthPanel] Redirecting to /app');
        router.push('/app');
      }, 150);
    } catch (err: any) {
      setError(err.message || 'Login failed');
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setUsernameSubmitError(false);

    // Name validation
    if (!firstName.trim()) { showToast('Please enter your first name', 'warning'); return; }
    if (!lastName.trim()) { showToast('Please enter your last name', 'warning'); return; }

    // Email validation
    if (!regEmail) {
      showToast('Please enter your email address', 'warning');
      setEmailValid(false);
      return;
    }

    if (!validateEmail(regEmail)) {
      showToast('Please enter a valid email address', 'warning');
      setEmailValid(false);
      return;
    }
    setEmailValid(true);

    // Phone number validation
    if (!phoneNumber) {
      showToast('Please enter your phone number', 'warning');
      setPhoneValid(false);
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      showToast('Please enter a valid UK mobile phone number', 'warning');
      setPhoneValid(false);
      return;
    }
    setPhoneValid(true);

    // Username validation
    if (!username) {
      showToast('Please enter a username', 'warning');
      setUsernameSubmitError(true);
      return;
    }

    if (/\s/.test(username)) {
      showToast('Username cannot contain spaces', 'warning');
      setUsernameSubmitError(true);
      return;
    }

    if (username.length < 3) {
      showToast('Username must be at least 3 characters', 'warning');
      setUsernameSubmitError(true);
      return;
    }

    if (username.length > 20) {
      showToast('Username must be 20 characters or less', 'warning');
      setUsernameSubmitError(true);
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      showToast('Username can only contain letters, numbers, and underscores', 'warning');
      setUsernameSubmitError(true);
      return;
    }

    if (usernameChecking) {
      showToast('Please wait while we check username availability...', 'info');
      return;
    }

    if (usernameAvailable === false) {
      showToast('This username is already taken. Try one of the suggestions below!', 'warning');
      setUsernameSubmitError(true);
      return;
    }

    if (usernameAvailable === null && username.length >= 3) {
      showToast('Please wait for username availability check to complete', 'info');
      return;
    }

    // Password validation
    if (!regPassword) {
      showToast('Please enter a password', 'warning');
      return;
    }

    if (regPassword.length < 8 || !/[A-Z]/.test(regPassword) || !/[!@#$%^&*(),.?":{}|<>]/.test(regPassword)) {
      showToast('Password must include: 1 capital letter, 1 special character, 8+ characters', 'warning');
      return;
    }

    if (!confirmPassword) {
      showToast('Please confirm your password', 'warning');
      return;
    }

    if (regPassword !== confirmPassword) {
      showToast('Passwords do not match', 'warning');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail,
          phoneNumber,
          username,
          password: regPassword,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Registration successful - open email verification panel
      showToast('Registration Successful! Check your email for the verification code.', 'success');

      // Store email for verification panel before clearing
      const userEmail = regEmail;

      // Clear registration form
      setRegEmail('');
      setFirstName('');
      setLastName('');
      setPhoneNumber('');
      setUsername('');
      setRegPassword('');
      setConfirmPassword('');
      setShowRegPassword(false);
      setShowConfirmPassword(false);
      setUsernameAvailable(null);
      setUsernameSuggestions([]);

      onClose(); // Close register panel

      setTimeout(() => {
        openPanel(
          'Verify Your Email',
          <EmailVerificationContent
            userId={data.userId}
            email={userEmail}
          />
        );
      }, 300); // Wait for register panel to close

    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    onClose(); // Close login panel

    setTimeout(() => {
      openPanel(
        'Forgot Password',
        <ForgotPasswordContent />
      );
    }, 300);
  };

  if (!shouldRender) return null;

  // Calculate transform for animation
  const transform = isAnimating ? 'translateX(0)' : 'translateX(100%)';

  return (
    <>
      {/* Backdrop */}
      <div
        className={`auth-panel-backdrop ${isAnimating ? 'active' : ''}`}
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
        onWheel={(e) => e.preventDefault()}
      />

      {/* Panel */}
      <div
        className="auth-panel"
        style={{
          transform,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Title Bar */}
        <div className="auth-panel-header">
          <button onClick={onClose} className="auth-panel-back">
            ‹
          </button>
          <h2 className="auth-panel-title">
            {view === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <div style={{ minWidth: '50px' }}>
            {/* Empty space for layout symmetry */}
          </div>
        </div>

        {/* Content */}
        <div className="auth-panel-content">
          <div className="auth-panel-logo">
            <Image
              src="/images/logo-horizontal.png"
              alt={PRODUCT_NAME}
              width={180}
              height={60}
              priority
              style={{ width: '180px', height: 'auto' }}
            />
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          {view === 'login' ? (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email or Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="you@example.com or @username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                <p style={{ textAlign: 'right', marginTop: '0.5rem', marginBottom: 0 }}>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-link"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.875rem' }}
                  >
                    Forgot password?
                  </button>
                </p>
              </div>

              {/* Verification Method Toggle */}
              <div className="form-group">
                <label className="form-label" style={{ marginBottom: '0.75rem' }}>
                  Send verification code via:
                </label>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  padding: '0.25rem',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                }}>
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('sms')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      background: verificationMethod === 'sms' ? 'var(--orange-500)' : 'transparent',
                      color: verificationMethod === 'sms' ? 'white' : 'var(--text-primary)',
                      fontWeight: verificationMethod === 'sms' ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <i className="fas fa-mobile-alt"></i>
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('email')}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: 'none',
                      borderRadius: '6px',
                      background: verificationMethod === 'email' ? 'var(--orange-500)' : 'transparent',
                      color: verificationMethod === 'email' ? 'white' : 'var(--text-primary)',
                      fontWeight: verificationMethod === 'email' ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <i className="fas fa-envelope"></i>
                    Email
                  </button>
                </div>
                <p style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  marginTop: '0.5rem',
                  marginBottom: 0,
                }}>
                  Choose how you want to receive your login verification code
                </p>
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>

              <p className="text-center text-sm text-muted" style={{ marginTop: '1.5rem' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleViewSwitch('register')}
                  className="text-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Create account
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              {/* First Name + Last Name */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">First Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="First name"
                    value={firstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Last Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Last name"
                    value={lastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className={`form-input ${!emailValid ? 'border-red-500' : ''}`}
                  placeholder="you@example.com"
                  value={regEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                />
                {!emailValid && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
                )}
              </div>

              {/* Phone Number */}
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="tel"
                  className={`form-input ${!phoneValid ? 'border-red-500' : ''}`}
                  placeholder="+447911123456 or 07911123456"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setPhoneValid(true);
                  }}
                  required
                />
                {!phoneValid && (
                  <p className="text-xs text-red-500 mt-1">Please enter a valid phone number</p>
                )}
              </div>

              {/* Username */}
              <div className="form-group">
                <label className="form-label">Username</label>
                <div className="input-wrapper">
                  <span className="input-icon">@</span>
                  <input
                    type="text"
                    className="form-input input-with-icon input-with-status"
                    placeholder="username"
                    value={username}
                    onChange={(e) => {
                      handleUsernameChange(e.target.value);
                      setUsernameSubmitError(false); // Clear error when user types
                    }}
                    pattern="[a-zA-Z0-9_]{3,20}"
                    title="3-20 characters, letters, numbers, and underscores only"
                    required
                  />
                  {username.length > 0 && (
                    <span className="input-status-icon">
                      {usernameChecking && (
                        <span style={{ color: '#f97316', fontSize: '1rem' }}><i className="fas fa-spinner fa-spin"></i></span>
                      )}
                      {!usernameChecking && username.length >= 3 && !isUsernameInvalid() && usernameAvailable === true && (
                        <span style={{ color: '#22c55e', fontSize: '1.25rem' }}><i className="fas fa-check"></i></span>
                      )}
                      {!usernameChecking && (isUsernameInvalid() || usernameAvailable === false) && (
                        <span style={{ color: '#ef4444', fontSize: '1.25rem' }}><i className="fas fa-times"></i></span>
                      )}
                    </span>
                  )}
                </div>
                {/* Only show validation message on submit error */}
                {usernameSubmitError && (
                  <p className="text-xs text-red-500 mt-1">No spaces, 3-20 characters, letters/numbers/underscores only</p>
                )}
                {/* Username suggestions when username is taken */}
                {usernameSuggestions.length > 0 && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.5rem'
                    }}>
                      Try these available usernames:
                    </p>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      {usernameSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '6px',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--orange-500)';
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.borderColor = 'var(--orange-500)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-secondary)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.borderColor = 'var(--border)';
                          }}
                        >
                          @{suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    tabIndex={-1}
                  >
                    <i className={`fas ${showRegPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {/* RAG Password Strength Bar - Always visible when typing */}
                {regPassword && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{
                      height: '4px',
                      width: '100%',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${passwordStrength}%`,
                          transition: 'all 0.3s ease',
                          backgroundColor:
                            passwordStrength <= 25 ? '#ef4444' : // Red
                            passwordStrength <= 50 ? '#f97316' : // Orange
                            passwordStrength <= 75 ? '#eab308' : // Yellow
                            '#22c55e' // Green
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {confirmPassword && regPassword !== confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>

              <p className="text-center text-sm text-muted" style={{ marginTop: '1.5rem' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleViewSwitch('login')}
                  className="text-link"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  );
}

