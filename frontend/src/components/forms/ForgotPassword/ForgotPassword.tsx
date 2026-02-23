'use client';

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import { usePanels } from '@/contexts/PanelContext';
import { useToast } from '@/contexts/ToastContext';
import styles from './ForgotPassword.module.css';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

export function ForgotPasswordContent() {
  const { closeTopPanel, openPanel } = usePanels();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBackToSignIn = () => {
    closeTopPanel();

    // Wait for panel to close, then open login panel
    setTimeout(() => {
      import('@/components/forms/LoginForm/LoginForm').then((module) => {
        const { LoginFormContent } = module;
        openPanel('Sign In', <LoginFormContent />);
      });
    }, 300);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Please enter a valid email address', 'error');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to send reset email', 'error');
        return;
      }

      showToast('Password reset link sent! Check your email.', 'success', 6000);

      // Auto-navigate back to login after 2 seconds
      setTimeout(() => {
        handleBackToSignIn();
      }, 2000);
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset email', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-panel-logo">
        <Image src="/images/logo-horizontal.png" alt={PRODUCT_NAME} width={180} height={60} priority style={{ width: '180px', height: 'auto' }} />
      </div>

      <form onSubmit={handleSubmit}>
        <p className={styles.introText}>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>

        <div className="form-group">
          <label htmlFor="forgot-password-email" className="form-label">Email</label>
          <input
            id="forgot-password-email"
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <p className={`text-center text-sm text-muted ${styles.switchText}`}>
          Remember your password?{' '}
          <button type="button" onClick={handleBackToSignIn} className={`text-link ${styles.switchBtn}`}>
            Sign in
          </button>
        </p>
      </form>
    </>
  );
}
