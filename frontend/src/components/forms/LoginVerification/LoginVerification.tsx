import { saveAuthToken } from '@/lib/authUtils';

import { useState, FormEvent, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/contexts/ToastContext';

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
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`, {
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
        />
      </div>

      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--blue-300)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          We've sent a 6-digit code to
        </p>
        <p style={{ color: 'var(--orange-500)', fontSize: '1rem', fontWeight: 600, marginBottom: 0 }}>
          {email}
        </p>
      </div>

      <form onSubmit={handleVerify}>
        {/* 6 OTP Input Boxes */}
        <div className="form-group">
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            marginBottom: '0.5rem'
          }}>
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
                style={{
                  width: '50px',
                  height: '50px',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-input)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '0.5rem',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  transition: 'all 0.2s',
                  ...(digit && {
                    borderColor: 'var(--orange-500)',
                    background: 'rgba(249, 115, 22, 0.1)'
                  })
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'var(--orange-500)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
                }}
                onBlur={(e) => {
                  if (!digit) {
                    e.target.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                    e.target.style.boxShadow = 'none';
                  }
                }}
              />
            ))}
          </div>

          <p style={{
            color: 'var(--blue-300)',
            fontSize: '0.75rem',
            textAlign: 'center',
            marginBottom: 0
          }}>
            Code expires in 15 minutes
          </p>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || code.some(d => !d)}
          style={{ width: '100%' }}
        >
          {loading ? 'Verifying...' : 'Verify Login'}
        </button>
      </form>

      <div style={{
        marginTop: '1.5rem',
        textAlign: 'center'
      }}>
        <p style={{ color: 'var(--blue-300)', fontSize: '0.875rem', marginBottom: 0 }}>
          Didn't receive the code ?{' '}
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--orange-500)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
            onClick={() => {
              // TODO: Implement resend functionality
              showToast('Resend functionality coming soon!', 'info');
            }}
          >
            Resend
          </button>
        </p>
      </div>

      <div style={{
        background: 'rgba(59, 130, 246, 0.1)',
        border: '1px solid rgba(59, 130, 246, 0.3)',
        borderRadius: '0.5rem',
        padding: '1rem',
        marginTop: '1rem'
      }}>
        <p style={{ color: 'var(--blue-300)', fontSize: '0.75rem', textAlign: 'center', margin: 0 }}>
          <i className="fas fa-lightbulb"></i> Check your spam folder if you don't see the email
        </p>
      </div>
    </>
  );
}

