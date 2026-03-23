import { saveAuthToken } from '@/lib/authUtils';
import styles from './LoginVerification.module.css';

import { useState, useEffect, useCallback, FormEvent, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';
import { getApiBase } from '@/lib/api';

const API = getApiBase();

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

interface LoginVerificationProps {
  userId: string;
  email: string;
  password: string;
  verificationCode?: string; // For demo purposes only
}

export function LoginVerificationContent({ userId, email, password }: LoginVerificationProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setResendCooldown(60);
    try {
      const res = await fetch(`${API}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type: 'login' }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to resend code', 'error');
        setResendCooldown(0);
        return;
      }
      showToast('New verification code sent!', 'success');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch {
      showToast('Failed to resend code', 'error');
      setResendCooldown(0);
    }
  }, [resendCooldown, userId, showToast]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle left arrow
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle right arrow
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setCode(newCode);

    // Focus last filled input or next empty
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();

    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      showToast('Please enter all 6 digits', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          loginVerificationCode: fullCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Verification failed', 'error');
        // Clear code on error
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      // Store token and trigger WebSocket connection
      saveAuthToken(data.token, data.user);

      showToast('Login verified successfully!', 'success', 2000);

      // Redirect to app
      setTimeout(() => {
        router.push('/app');
      }, 500);
    } catch (err: any) {
      showToast(err.message || 'Verification failed', 'error');
      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Logo - matching AuthPanel style */}
      <div className="auth-panel-logo">
        <Image
          src="/images/logo-horizontal.png"
          alt={PRODUCT_NAME}
          width={180}
          height={60}
          priority
          style={{ width: '180px', height: 'auto' }}
          className={styles.logoImg}
        />
      </div>

      <div className={styles.intro}>
        <p className={styles.introText}>We&apos;ve sent a 6-digit code to</p>
        <p className={styles.introEmail}>{email}</p>
      </div>

      <form onSubmit={handleVerify}>
        {/* 6 OTP Input Boxes */}
        <div className="form-group">
          <div className={styles.otpRow}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                autoFocus={index === 0}
                className={`${styles.otpInput} ${digit ? styles.otpInputFilled : ''}`}
              />
            ))}
          </div>

          <p className={styles.expiryText}>Code expires in 15 minutes</p>
        </div>

        <button
          type="submit"
          className={`btn btn-primary ${styles.submitBtn}`}
          disabled={loading || code.some(d => !d)}
        >
          {loading ? 'Verifying...' : 'Verify Login'}
        </button>
      </form>

      <div className={styles.resendWrapper}>
        <p className={styles.resendText}>
          Didn&apos;t receive the code ?{' '}
          <button
            type="button"
            className={styles.resendBtn}
            onClick={handleResend}
            disabled={resendCooldown > 0}
          >
            {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
          </button>
        </p>
      </div>

      <div className={styles.hint}>
        <p className={styles.hintText}>
          <i className="fas fa-lightbulb"></i> Check your spam folder if you don&apos;t see the email
        </p>
      </div>
    </>
  );
}

