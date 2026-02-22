'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import api from '@/lib/api';
import { saveAuthToken } from '@/lib/authUtils';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

function Setup2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      router.push('/register');
      return;
    }

    const setup2FA = async () => {
      try {
        const data = await api.auth.setup2FA(userId);
        setQrCode(data.qrCode);
        setSecret(data.secret);
      } catch (err: any) {
        setError(err.message || 'Failed to set up 2FA');
      } finally {
        setSetupLoading(false);
      }
    };

    setup2FA();
  }, [userId, router]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    if (!userId) {
      setError('User ID is missing');
      return;
    }

    setLoading(true);

    try {
      const data = await api.auth.verify2FA(userId, code);

      saveAuthToken(data.token, data.user);

      router.push('/app');
    } catch (err: any) {
      setError(err.message || '2FA verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (setupLoading) {
    return (
      <div className="page-container">
        <div style={{ maxWidth: '28rem', width: '100%' }}>
          <div className="card">
            <div className="text-center">
              <div className="loading-spinner"></div>
              <p className="text-muted mt-4">Setting up 2FA...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ maxWidth: '32rem', width: '100%' }}>
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

          <h1>Set Up Two-Factor Authentication</h1>
          <p className="subtitle">
            Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>

          {/* Error Message */}
          {error && (
            <div className="error-message">{error}</div>
          )}

          {/* QR Code */}
          {qrCode && (
            <div className="mb-6">
              <div className="qr-code-container">
                <img src={qrCode} alt="QR Code" className="qr-code" />
              </div>

              <div className="mt-4 p-4" style={{
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '0.75rem',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <p className="text-sm text-muted mb-2">Or enter this key manually:</p>
                <code className="text-sm" style={{
                  color: 'var(--orange-500)',
                  wordBreak: 'break-all',
                  display: 'block',
                  fontFamily: 'monospace'
                }}>
                  {secret}
                </code>
              </div>
            </div>
          )}

          {/* Verification Form */}
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label className="form-label">Enter 6-digit code</label>
              <input
                type="text"
                className="form-input"
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                pattern="\d{6}"
                required
                autoFocus
              />
              <p className="text-xs text-muted mt-2">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Enable 2FA'}
            </button>
          </form>

          {/* Back Link */}
          <div className="text-center mt-6">
            <a href="/register" className="text-sm text-muted text-link">
              ← Start over
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Setup2FAPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <Setup2FAContent />
    </Suspense>
  );
}
