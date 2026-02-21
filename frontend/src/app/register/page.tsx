'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [usernameManuallyEdited, setUsernameManuallyEdited] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [emailValid, setEmailValid] = useState(true);

  // Password strength calculation
  const calculatePasswordStrength = (pwd: string): number => {
    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 25;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) strength += 25;
    return strength;
  };

  const passwordStrength = calculatePasswordStrength(password);

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

  // Handle email change and auto-populate username
  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    setEmailValid(true);

    // Auto-populate username from email if not manually edited
    if (!usernameManuallyEdited) {
      // Extract username from email (before @ if present, otherwise use whole input)
      const emailPrefix = newEmail.includes('@') ? newEmail.split('@')[0] : newEmail;
      // Clean username: remove non-alphanumeric (except underscore), limit to 20 chars
      const cleanUsername = emailPrefix.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
      setUsername(cleanUsername);
    }
  };

  // Handle username change
  const handleUsernameChange = (newUsername: string) => {
    setUsernameManuallyEdited(true);
    setUsername(newUsername.replace(/\s/g, ''));
  };

  // Check if username field is invalid and has content
  const isUsernameInvalid = () => {
    if (!username) return false;
    return username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username);
  };

  // Check username availability (debounced)
  useEffect(() => {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Check if username is valid format first
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameAvailable(null);
      return;
    }

    const timer = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/users/check-username?username=${encodeURIComponent(username)}`
        );
        const data = await response.json();
        setUsernameAvailable(data.available);
      } catch (err) {
        console.error('Username check failed:', err);
      } finally {
        setUsernameChecking(false);
      }
    }, 800); // Increased debounce to 800ms for better UX

    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Email validation
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      setEmailValid(false);
      return;
    }
    setEmailValid(true);

    // Username validation (no spaces)
    if (/\s/.test(username)) {
      setError('Username cannot contain spaces');
      return;
    }

    if (username.length < 3 || username.length > 20) {
      setError('Username must be 3-20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    // Check username availability
    if (usernameAvailable === false) {
      setError('Username is already taken');
      return;
    }

    // Password validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must include at least one capital letter');
      return;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError('Password must include at least one special character');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const data = await api.auth.register(email, username, password);

      // Redirect to 2FA setup page with userId
      if (data.requiresTwoFactorSetup && data.userId) {
        router.push(`/setup-2fa?userId=${data.userId}`);
      } else {
        router.push('/app');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div style={{ maxWidth: '28rem', width: '100%' }} className="animate-fade-in">
        <div className="card">
          {/* Logo */}
          <div className="logo">
            <Image
              src="/images/logo-horizontal.png"
              alt={PRODUCT_NAME}
              width={180}
              height={60}
              priority
              className="logo-image"
            />
          </div>

          <h1>Create your account</h1>
          <p className="subtitle">Join {PRODUCT_NAME} and start messaging</p>

          {/* Error Message */}
          {error && (
            <div className="error-message">{error}</div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className={`form-input ${!emailValid ? 'border-red-500' : ''}`}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                required
              />
              {!emailValid && (
                <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
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
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  pattern="[a-zA-Z0-9_]{3,20}"
                  title="3-20 characters, letters, numbers, and underscores only"
                  required
                />
                {username.length >= 3 && !isUsernameInvalid() && (
                  <span className="input-status-icon">
                    {usernameChecking && (
                      <span className="text-gray-400 text-sm"><i className="fas fa-spinner fa-spin"></i></span>
                    )}
                    {!usernameChecking && usernameAvailable === true && (
                      <span className="text-green-500 text-xl"><i className="fas fa-check"></i></span>
                    )}
                    {!usernameChecking && usernameAvailable === false && (
                      <span className="text-red-500 text-xl"><i className="fas fa-times"></i></span>
                    )}
                  </span>
                )}
              </div>
              {isUsernameInvalid() && (
                <p className="text-xs text-red-500 mt-1">No spaces, 3-20 characters, letters/numbers/underscores only</p>
              )}
              {!usernameChecking && usernameAvailable === false && username.length >= 3 && !isUsernameInvalid() && (
                <p className="text-xs text-red-500 mt-1">Username not available</p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
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
              {password && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${getStrengthColor()}`}
                        style={{ width: `${passwordStrength}%` }}
                      />
                    </div>
                    <span className="text-xs">{getStrengthText()}</span>
                  </div>
                  {!passwordMeetsRequirements(password) && (
                    <p className="text-xs text-muted">
                      Must include: 1 capital letter, 1 special character, 8+ characters
                    </p>
                  )}
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
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading || usernameChecking || usernameAvailable === false}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          {/* Sign In Link */}
          <p className="text-center text-sm text-muted mt-6">
            Already have an account?{' '}
            <a href="/login" className="text-link">
              Sign in
            </a>
          </p>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <a href="/" className="text-sm text-muted text-link">
            ← Back to home
          </a>
        </div>
      </div>
    </div>
  );
}

