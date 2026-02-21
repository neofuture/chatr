'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BackgroundBlobs from '@/components/BackgroundBlobs/BackgroundBlobs';
import AuthPanel from '@/components/panels/AuthPanel/AuthPanel';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import Button from '@/components/form-controls/Button/Button';
import { useRouter } from 'next/navigation';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';

export default function HomePage() {
  const router = useRouter();
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');

    // Only redirect to /app if we have VALID auth data
    if (token && user && token !== 'undefined' && user !== 'undefined') {
      try {
        // Validate that user data is valid JSON
        JSON.parse(user);
        console.log('[HomePage] Valid auth found, redirecting to /app');
        router.push('/app');
      } catch (e) {
        // Invalid JSON, clear it and stay on home page
        console.log('[HomePage] Invalid auth data, staying on home page');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } else {
      console.log('[HomePage] No auth found, staying on home page');
    }
  }, [router]);

  const openLogin = () => {
    setAuthView('login');
    setAuthPanelOpen(true);
  };

  const openRegister = () => {
    setAuthView('register');
    setAuthPanelOpen(true);
  };


  return (
    <div className="hero-container">
      <BackgroundBlobs />

      {/* Theme Toggle */}
      <div style={{
        position: 'fixed',
        top: '1.5rem',
        right: '1.5rem',
        zIndex: 1000
      }}>
        <ThemeToggle />
      </div>

      <div className="hero-content">
        {/* Logo */}
        <div className="hero-logo-wrapper">
          <Image
            src="/images/logo-vertical.png"
            alt={PRODUCT_NAME}
            width={200}
            height={200}
            priority
            className="hero-logo-image"
          />
        </div>

        {/* Tagline */}
        <p className="hero-tagline">Connect. Chat. Collaborate.</p>
        <p className="hero-description">
          Real-time messaging with friends and groups. Stay connected anytime, anywhere.
        </p>

        {/* CTA Buttons */}
        <div className="quote-card">
          <div className="cta-buttons">
            <button onClick={openRegister} className="cta-btn cta-primary">
              <span>Create Account</span>
              <span>›</span>
            </button>

            <button onClick={openLogin} className="cta-btn cta-secondary">
              <span>Sign In</span>
              <span>›</span>
            </button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon"><i className="fas fa-bolt"></i></div>
            <h3 className="feature-title">Real-time</h3>
            <p className="feature-description">Instant message delivery with live updates</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><i className="fas fa-lock"></i></div>
            <h3 className="feature-title">Secure</h3>
            <p className="feature-description">Your conversations are private and protected</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><i className="fas fa-mobile-alt"></i></div>
            <h3 className="feature-title">Offline Mode</h3>
            <p className="feature-description">Messages sync when you reconnect</p>
          </div>
        </div>

        {/* Features List */}
        <div className="features-list">
          <div className="feature-item">
            <span className="check-icon"><i className="fas fa-check"></i></span>
            <span>Private messaging</span>
          </div>
          <div className="feature-item">
            <span className="check-icon"><i className="fas fa-check"></i></span>
            <span>Group chats</span>
          </div>
          <div className="feature-item">
            <span className="check-icon"><i className="fas fa-check"></i></span>
            <span>User search</span>
          </div>
          <div className="feature-item">
            <span className="check-icon"><i className="fas fa-check"></i></span>
            <span>Always free</span>
          </div>
        </div>

        {/* Demo and Docs Links */}
        <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/demo">
            <Button variant="blue">
              <i className="fas fa-palette"></i> View Component Demos →
            </Button>
          </Link>
          <Link href="/docs">
            <Button variant="purple">
              <i className="fas fa-book"></i> Read Documentation →
            </Button>
          </Link>
          {process.env.NODE_ENV === 'development' && (
            <a href="http://localhost:5555" target="_blank" rel="noopener noreferrer">
              <Button variant="green">
                🗄️ Database Console →
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Auth Panel */}
      <AuthPanel
        isOpen={authPanelOpen}
        onClose={() => setAuthPanelOpen(false)}
        initialView={authView}
      />
    </div>
  );
}
