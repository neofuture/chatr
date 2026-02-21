'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePanels } from '@/contexts/PanelContext';
import { useToast } from '@/contexts/ToastContext';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

export function LoginFormContent() {
  const router = useRouter();
  const { openPanel, closeTopPanel } = usePanels();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Login failed', 'error');
        return;
      }

      // Check if login verification is required
      if (data.requiresLoginVerification) {
        showToast('Verification code sent to your email', 'success', 3000);

        // Close login panel
        closeTopPanel();

        // Open login verification panel
        setTimeout(() => {
          import('@/components/forms/LoginVerification/LoginVerification').then((module) => {
            const { LoginVerificationContent } = module;
            openPanel(
              'Verify Login',
              <LoginVerificationContent
                userId={data.userId}
                email={email}
                password={password}
                verificationCode={data.loginVerificationCode} // Demo only
              />
            );
          });
        }, 300);
        return;
      }

      // Direct login success (no verification needed)
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      showToast('Login successful!', 'success', 2000);

      setTimeout(() => {
        router.push('/app');
      }, 500);
    } catch (err: any) {
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    closeTopPanel(); // Close current login panel first

    setTimeout(() => {
      import('@/components/forms/ForgotPassword/ForgotPassword').then((module) => {
        const { ForgotPasswordContent } = module;
        openPanel('Forgot Password', <ForgotPasswordContent />);
      });
    }, 300); // Wait for close animation
  };

  return (
    <>
      {/* Logo */}
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

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="login-email" className="form-label">Email or Username</label>
          <input
            id="login-email"
            type="text"
            className="form-input"
            placeholder="you@example.com or @username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">Password</label>
          <div className="password-input-wrapper">
            <input
              id="login-password"
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
              aria-label={showPassword ? 'Hide password' : 'Show password'}
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

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </>
  );
}

