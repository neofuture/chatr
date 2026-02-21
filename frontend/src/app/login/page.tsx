'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api.auth.login(email, password, twoFactorCode || undefined);

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setLoading(false);
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/app');
    } catch (err: any) {
      setError(err.message || 'Login failed');
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

          <h1>Welcome back</h1>
          <p className="subtitle">
            {requiresTwoFactor ? 'Enter your 2FA code' : 'Sign in to your account'}
          </p>

          {/* Error Message */}
          {error && (
            <div className="error-message">{error}</div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {!requiresTwoFactor ? (
              <>
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
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label">6-digit code</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="123456"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  pattern="\d{6}"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted mt-2">
                  Enter the code from your authenticator app
                </p>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Signing in...' : (requiresTwoFactor ? 'Verify Code' : 'Sign In')}
            </button>
          </form>

          {requiresTwoFactor && (
            <div className="text-center mt-4">
              <button
                onClick={() => {
                  setRequiresTwoFactor(false);
                  setTwoFactorCode('');
                  setError('');
                }}
                className="text-sm text-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                ← Back to login
              </button>
            </div>
          )}

          <p className="text-center text-sm text-muted mt-6">
            Don't have an account?{' '}
            <a href="/register" className="text-link">Create account</a>
          </p>
        </div>

        <div className="text-center mt-6">
          <a href="/" className="text-sm text-muted text-link">← Back to home</a>
        </div>
      </div>
    </div>
  );
}

