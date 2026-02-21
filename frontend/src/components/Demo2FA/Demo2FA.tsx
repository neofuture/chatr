'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import Image from 'next/image';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

export function Demo2FAContent() {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const demoCode = '123456';

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setCode(newCode);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
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
          demo@example.com
        </p>
      </div>

      <form onSubmit={(e) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode === demoCode) {
          alert('✅ Verification successful! In the real app, you would now be logged in.');
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        } else {
          alert('❌ Incorrect code. Try: ' + demoCode);
        }
      }}>
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
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                autoFocus={index === 0}
                style={{
                  width: '45px',
                  height: '45px',
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '0.5rem',
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
          disabled={code.some(d => !d)}
          style={{ width: '100%' }}
        >
          Verify Email
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
              alert('In the real app, a new code would be sent to your email!');
            }}
          >
            Resend
          </button>
        </p>
      </div>
    </>
  );
}

