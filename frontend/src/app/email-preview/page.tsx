'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/form-controls/Button/Button';
import Input from '@/components/form-controls/Input/Input';
import Select from '@/components/form-controls/Select/Select';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import { useTheme } from '@/contexts/ThemeContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function EmailPreviewPage() {
  const { theme } = useTheme();
  const [emailType, setEmailType] = useState('verification');
  const [email, setEmail] = useState('user@example.com');
  const [username, setUsername] = useState('@testuser');
  const [code, setCode] = useState('123456');
  const [previewMode, setPreviewMode] = useState<'default' | 'invert' | 'apple-mail'>('default');
  const [iframeKey, setIframeKey] = useState(0);

  const getPreviewURL = () => {
    const params = new URLSearchParams({
      type: emailType,
      code,
      email,
      username,
      userId: 'test123',
      theme,
      previewMode
    });
    return `${API_URL}/api/email-preview?${params.toString()}`;
  };

  const refreshPreview = () => {
    setIframeKey(prev => prev + 1);
  };

  useEffect(() => {
    refreshPreview();
  }, [theme, previewMode]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}><i className="fas fa-envelope"></i> Email Template Preview</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link href="/demo" style={{ textDecoration: 'none' }}>
            <Button variant="blue"><i className="fas fa-palette"></i> Component Demos</Button>
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Controls */}
      <div style={{
        background: 'var(--bg-container)',
        padding: '20px',
        borderRadius: '8px',
        marginBottom: '30px',
        border: '1px solid var(--border-color)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '15px'
      }}>
        <Select
          label="Email Type"
          value={emailType}
          onChange={(e) => { setEmailType(e.target.value); refreshPreview(); }}
        >
          <option value="verification">Registration Verification</option>
          <option value="login">Login Verification (OTP)</option>
          <option value="reset">Password Reset</option>
        </Select>

        <Input
          type="email"
          label="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={refreshPreview}
        />

        <Input
          type="text"
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onBlur={refreshPreview}
        />

        <Input
          type="text"
          label="Verification Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onBlur={refreshPreview}
          maxLength={6}
        />

        <Select
          label="Preview Mode"
          value={previewMode}
          onChange={(e) => { setPreviewMode(e.target.value as 'default' | 'invert' | 'apple-mail'); }}
        >
          <option value="default">Default (No Simulation)</option>
          <option value="invert">Auto-Invert (Generic)</option>
          <option value="apple-mail">Apple Mail Dark Mode</option>
        </Select>
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Button onClick={refreshPreview} variant="blue"><i className="fas fa-sync-alt"></i> Refresh Preview</Button>
        <Button onClick={() => window.open(getPreviewURL(), '_blank')} variant="green"><i className="fas fa-rocket"></i> Open in New Tab</Button>
        <Button
          onClick={() => {
            navigator.clipboard.writeText(getPreviewURL());
            alert('Preview URL copied to clipboard!');
          }}
          variant="orange"
        >
          📋 Copy URL
        </Button>
      </div>

      {/* Preview */}
      <div style={{
        background: 'var(--bg-container)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '15px 20px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <span>Email Preview (Live from Backend API)</span>
          <code style={{
            background: 'rgba(255,255,255,0.2)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            GET /api/email-preview
          </code>
        </div>

        <iframe
          key={iframeKey}
          src={getPreviewURL()}
          style={{
            width: '100%',
            height: '600px',
            border: 'none',
            background: 'white'
          }}
          title="Email Preview"
        />
      </div>
    </div>
  );
}
