'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePanels } from '@/contexts/PanelContext';
import { useToast } from '@/contexts/ToastContext';
import { useConfirmation } from '@/contexts/ConfirmationContext';
import { Panel1Content } from '@/components/panels/DemoPanels/DemoPanels';
import { Demo2FAContent } from '@/components/Demo2FA/Demo2FA';
import BackgroundBlobs from '@/components/BackgroundBlobs/BackgroundBlobs';
import BottomSheetDemo from '@/components/BottomSheetDemo/BottomSheetDemo';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import Button from '@/components/form-controls/Button/Button';
import DatePicker from '@/components/form-controls/DatePicker/DatePicker';

import { version } from '@/version';

const PRODUCT_NAME = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function DemoPage() {
  const { openPanel } = usePanels();
  const { showToast } = useToast();
  const { showConfirmation } = useConfirmation();

  // DatePicker states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const [selectedDateTime, setSelectedDateTime] = useState<Date>(new Date());

  const openDemoPanel = () => {
    openPanel('Panel 1', <Panel1Content />);
  };

  const open2FADemo = () => {
    openPanel('Verify Your Email', <Demo2FAContent />);
  };

  // Demo toast handlers
  const showSuccessToast = () => {
    showToast('Operation completed successfully!', 'success');
  };

  const showErrorToast = () => {
    showToast('Something went wrong. Please try again.', 'error');
  };

  const showInfoToast = () => {
    showToast('Here is some helpful information for you.', 'info');
  };

  const showWarningToast = () => {
    showToast('Please be careful with this action.', 'warning');
  };

  const showMultipleToasts = () => {
    showToast('First notification', 'info', 6000);
    setTimeout(() => showToast('Second notification', 'success', 6000), 500);
    setTimeout(() => showToast('Third notification', 'warning', 6000), 1000);
  };

  // Demo confirmation handlers
  const showInfoConfirmation = async () => {
    const result = await showConfirmation({
      title: 'Continue to Next Step?',
      message: 'You are about to proceed to the next step. Do you want to continue?',
      urgency: 'info',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Continue', variant: 'primary', value: true },
      ],
    });

    if (result) {
      showToast('Continued to next step', 'success');
    } else {
      showToast('Action cancelled', 'info');
    }
  };

  const showWarningConfirmation = async () => {
    const result = await showConfirmation({
      title: 'Discard Changes?',
      message: 'You have unsaved changes. Are you sure you want to discard them?',
      urgency: 'warning',
      actions: [
        { label: 'Keep Editing', variant: 'secondary', value: false },
        { label: 'Discard', variant: 'destructive', value: true },
      ],
    });

    if (result) {
      showToast('Changes discarded', 'warning');
    }
  };

  const showDangerConfirmation = async () => {
    const result = await showConfirmation({
      title: 'Delete Account?',
      message: 'This action cannot be undone. Your account and all data will be permanently deleted.',
      urgency: 'danger',
      actions: [
        { label: 'Cancel', variant: 'secondary', value: false },
        { label: 'Delete Account', variant: 'destructive', value: true },
      ],
    });

    if (result) {
      showToast('Account deleted (demo)', 'error');
    }
  };

  const showSimpleOK = async () => {
    await showConfirmation({
      title: 'Welcome!',
      message: 'Thanks for trying out the confirmation dialog system.',
      urgency: 'info',
      actions: [
        { label: 'Got It', variant: 'primary', value: true },
      ],
    });
  };

  const showYesNo = async () => {
    const result = await showConfirmation({
      title: 'Enable Notifications?',
      message: 'Would you like to receive notifications for new messages?',
      urgency: 'info',
      actions: [
        { label: 'No', variant: 'secondary', value: false },
        { label: 'Yes', variant: 'primary', value: true },
      ],
    });

    showToast(result ? 'Notifications enabled' : 'Notifications disabled', 'info');
  };

  const showThreeOptions = async () => {
    const result = await showConfirmation({
      title: 'Save Changes?',
      message: 'You have unsaved changes. What would you like to do?',
      urgency: 'info',
      actions: [
        { label: 'Discard', variant: 'destructive', value: 'discard' },
        { label: 'Save as Draft', variant: 'secondary', value: 'draft' },
        { label: 'Publish', variant: 'primary', value: 'publish' },
      ],
    });

    if (result) {
      showToast(`Action: ${result}`, 'success');
    }
  };

  return (
    <div className="hero-container">
      <BackgroundBlobs />

      <div className="hero-content">
        {/* Theme Toggle - Top Right */}
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 1000
        }}>
          <ThemeToggle />
        </div>

        {/* Env Info Bar */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px 20px',
          justifyContent: 'center', alignItems: 'center',
          padding: '8px 20px', marginBottom: '2rem',
          borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px',
          backgroundColor: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.15)',
        }}>
          {[
            { label: 'API URL', value: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001' },
            { label: 'WS URL',  value: process.env.NEXT_PUBLIC_WS_URL  || 'http://localhost:3001' },
            { label: 'App',     value: process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Chatr' },
            { label: 'Version', value: version },
            { label: 'Env',     value: process.env.NODE_ENV || 'unknown' },
          ].map(({ label, value }) => (
            <span key={label} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ opacity: 0.45 }}>{label}:</span>
              <span style={{ color: '#3b82f6', fontWeight: '600' }}>{value}</span>
            </span>
          ))}
        </div>

        {/* Page Title */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            color: 'var(--text-primary)',
            fontSize: '3rem',
            marginBottom: '1rem',
            fontWeight: 'bold'
          }}>
            {PRODUCT_NAME} Demo
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '1.25rem'
          }}>
            Explore our UI components and features
          </p>
          <div style={{ marginTop: '1.25rem' }}>
            <Link href="/email-preview" style={{ textDecoration: 'none' }}>
              <Button variant="orange"><i className="fas fa-envelope"></i> Email Templates</Button>
            </Link>
          </div>
        </div>

        {/* Panel Demos Section */}
        <div style={{
          marginBottom: '3rem',
          padding: '2rem',
          background: 'var(--bg-container)',
          borderRadius: '1rem',
          border: '1px solid rgba(168, 85, 247, 0.3)'
        }}>
          <h2 style={{
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <i className="fas fa-window-restore"></i> Panel System
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            Test our sliding panel system with stacking and navigation
          </p>
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Button onClick={openDemoPanel} variant="purple">
              <i className="fas fa-layer-group"></i> Stacked Panels Demo
            </Button>

            <Button onClick={open2FADemo} variant="green">
              <i className="fas fa-envelope-open-text"></i> Email Verification Demo
            </Button>
          </div>
        </div>

        {/* Toast Demos Section */}
        <div style={{
          padding: '2rem',
          background: 'var(--bg-container)',
          borderRadius: '1rem',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <h2 style={{
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <i className="fas fa-bell"></i> Toast Notifications
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            Try our toast notification system - hover over toasts to pause the timer!
          </p>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Button onClick={showSuccessToast} variant="green">
              <i className="fas fa-check"></i> Success
            </Button>

            <Button onClick={showErrorToast} variant="red">
              <i className="fas fa-times"></i> Error
            </Button>

            <Button onClick={showInfoToast} variant="blue">
              <i className="fas fa-info-circle"></i> Info
            </Button>

            <Button onClick={showWarningToast} variant="orange">
              <i className="fas fa-exclamation-triangle"></i> Warning
            </Button>

            <Button onClick={showMultipleToasts} variant="purple">
              <i className="fas fa-list-ol"></i> Multiple Toasts
            </Button>
          </div>
        </div>

        {/* Confirmation Demos Section */}
        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'var(--bg-container)',
          borderRadius: '1rem',
          border: '1px solid rgba(34, 197, 94, 0.3)'
        }}>
          <h2 style={{
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <i className="fas fa-check-circle"></i> Confirmation Dialogs
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            Experience our confirmation dialogs with various scenarios
          </p>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <Button onClick={showInfoConfirmation} variant="blue">
              Info Confirmation
            </Button>

            <Button onClick={showWarningConfirmation} variant="orange">
              Warning Confirmation
            </Button>

            <Button onClick={showDangerConfirmation} variant="red">
              Danger Confirmation
            </Button>

            <Button onClick={showSimpleOK} variant="green">
              Simple OK
            </Button>

            <Button onClick={showYesNo} variant="blue">
              Yes/No Confirmation
            </Button>

            <Button onClick={showThreeOptions} variant="orange">
              Three Options Confirmation
            </Button>
          </div>
        </div>

        {/* DatePicker Demo Section */}
        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'var(--bg-container)',
          borderRadius: '1rem',
          border: '1px solid rgba(249, 115, 22, 0.3)'
        }}>
          <h2 style={{
            color: 'var(--text-primary)',
            fontSize: '1.5rem',
            marginBottom: '1rem',
            textAlign: 'center'
          }}>
            <i className="fas fa-calendar-alt"></i> Date & Time Pickers
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.875rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            Click the calendar icon next to the label to open the calendar modal
          </p>
          <div style={{
            display: 'grid',
            gap: '1.5rem',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <DatePicker
              label="Select Date (Date Only)"
              value={selectedDate}
              onChange={(date) => {
                setSelectedDate(date);
                showToast(`Date selected: ${date.toLocaleDateString()}`, 'success');
              }}
              mode="date"
              locale="en-GB"
            />

            <DatePicker
              label="Select Time (Time Only)"
              value={selectedTime}
              onChange={(time) => {
                setSelectedTime(time);
                showToast(`Time selected: ${time.toLocaleTimeString()}`, 'success');
              }}
              mode="time"
            />

            <DatePicker
              label="Select Date & Time (Both)"
              value={selectedDateTime}
              onChange={(datetime) => {
                setSelectedDateTime(datetime);
                showToast(`DateTime selected: ${datetime.toLocaleString()}`, 'success');
              }}
              mode="datetime"
              locale="en-GB"
            />
          </div>
        </div>

        {/* Bottom Sheet Demo Section */}
        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'var(--bg-container)',
          borderRadius: '1rem',
          border: '1px solid rgba(59, 130, 246, 0.3)'
        }}>
          <BottomSheetDemo />
        </div>

        {/* API Endpoints Section */}
        <div style={{
          marginTop: '3rem',
          padding: '2rem',
          background: 'var(--bg-container)',
          borderRadius: '1rem',
          border: '1px solid rgba(99, 102, 241, 0.3)'
        }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            <i className="fas fa-plug"></i> API Endpoints
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem', textAlign: 'center' }}>
            All endpoints defined in the backend codebase
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>
            Base: <span style={{ color: '#22c55e' }}>{API_URL}</span>
          </p>

          {(
            [
              {
                group: 'Authentication', prefix: '/api/auth', color: 'rgba(249,115,22,0.3)', icon: 'fas fa-lock',
                routes: [
                  { method: 'POST', path: '/register', description: 'Register a new user', auth: false },
                  { method: 'POST', path: '/login', description: 'User login', auth: false },
                  { method: 'POST', path: '/logout', description: 'User logout', auth: false },
                  { method: 'POST', path: '/verify-email', description: 'Verify email with code', auth: false },
                  { method: 'POST', path: '/verify-phone', description: 'Verify phone with code', auth: false },
                  { method: 'POST', path: '/forgot-password', description: 'Request password reset', auth: false },
                  { method: 'POST', path: '/2fa/setup', description: 'Generate 2FA secret and QR code', auth: true },
                  { method: 'POST', path: '/2fa/verify', description: 'Verify 2FA code and enable 2FA', auth: true },
                ],
              },
              {
                group: 'Users', prefix: '/api/users', color: 'rgba(59,130,246,0.3)', icon: 'fas fa-users',
                routes: [
                  { method: 'GET', path: '/', description: 'Get all verified users', auth: true },
                  { method: 'GET', path: '/me', description: 'Get current user', auth: true },
                  { method: 'GET', path: '/check-username', description: 'Check if username is available', auth: false },
                  { method: 'GET', path: '/suggest-username', description: 'Get username suggestions', auth: false },
                  { method: 'GET', path: '/search', description: 'Search users by username', auth: false },
                  { method: 'GET', path: '/:username', description: 'Get user profile', auth: false },
                  { method: 'POST', path: '/profile-image', description: 'Upload profile image', auth: true },
                  { method: 'POST', path: '/cover-image', description: 'Upload cover image', auth: true },
                  { method: 'DELETE', path: '/profile-image', description: 'Delete profile image', auth: true },
                  { method: 'DELETE', path: '/cover-image', description: 'Delete cover image', auth: true },
                ],
              },
              {
                group: 'Messages', prefix: '/api/messages', color: 'rgba(34,197,94,0.3)', icon: 'fas fa-comments',
                routes: [
                  { method: 'GET', path: '/history', description: 'Get message history (otherUserId, limit, before)', auth: true },
                  { method: 'GET', path: '/conversations', description: 'Get user conversations', auth: false },
                  { method: 'POST', path: '/upload', description: 'Upload a file/audio message', auth: true },
                  { method: 'PATCH', path: '/:id/waveform', description: 'Update audio waveform data', auth: true },
                ],
              },
              {
                group: 'Groups', prefix: '/api/groups', color: 'rgba(168,85,247,0.3)', icon: 'fas fa-layer-group',
                routes: [
                  { method: 'POST', path: '/', description: 'Create a new group', auth: false },
                  { method: 'GET', path: '/:id', description: 'Get group details', auth: false },
                  { method: 'POST', path: '/:id/join', description: 'Join a group', auth: false },
                  { method: 'POST', path: '/:id/leave', description: 'Leave a group', auth: false },
                  { method: 'GET', path: '/:id/messages', description: 'Get group messages', auth: false },
                ],
              },
              {
                group: 'Misc', prefix: '/api', color: 'rgba(20,184,166,0.3)', icon: 'fas fa-cog',
                routes: [
                  { method: 'GET', path: '/email-preview', description: 'Preview email templates', auth: false },
                  { method: 'GET', path: '/docs', description: 'Swagger / API docs UI', auth: false },
                ],
              },
            ] as { group: string; prefix: string; color: string; icon: string; routes: { method: string; path: string; description: string; auth: boolean }[] }[]
          ).map(({ group, prefix, color, icon, routes }) => (
            <div key={group} style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                marginBottom: '0.75rem',
                paddingBottom: '0.5rem',
                borderBottom: `1px solid ${color}`,
              }}>
                <i className={icon} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}></i>
                <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{group}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{prefix}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {routes.map(({ method, path, description, auth }) => {
                  const methodColor: Record<string, string> = {
                    GET: '#22c55e', POST: '#3b82f6', PATCH: '#f59e0b', DELETE: '#ef4444', PUT: '#8b5cf6',
                  };
                  return (
                    <div key={method + path} style={{
                      display: 'grid',
                      gridTemplateColumns: '60px 1fr auto',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.4rem 0.75rem',
                      borderRadius: '0.4rem',
                      background: 'rgba(255,255,255,0.03)',
                      fontSize: '0.8rem',
                    }}>
                      <span style={{
                        fontFamily: 'monospace', fontWeight: '700', fontSize: '0.7rem',
                        color: methodColor[method] ?? '#94a3b8',
                        background: `${methodColor[method] ?? '#94a3b8'}20`,
                        padding: '0.15rem 0.35rem', borderRadius: '0.25rem', textAlign: 'center',
                      }}>{method}</span>
                      <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                        <span style={{ opacity: 0.35 }}>{API_URL}</span>
                        <span style={{ opacity: 0.55 }}>{prefix}</span>{path}
                        <span style={{ marginLeft: '0.75rem', fontFamily: 'sans-serif', opacity: 0.55, fontSize: '0.75rem' }}>{description}</span>
                      </span>
                      {auth && (
                        <span title="Requires auth" style={{ fontSize: '0.65rem', color: '#f59e0b', opacity: 0.8 }}>
                          <i className="fas fa-key"></i>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Back to Home Link */}
        <div style={{ marginTop: '3rem', textAlign: 'center', display: 'flex', gap: '1.5rem', justifyContent: 'center' }}>
          <Link
            href="/"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--blue-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            ← Back to Home
          </Link>
          <span style={{ color: 'var(--text-secondary)' }}>|</span>
          <Link
            href="/docs"
            style={{
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--blue-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            Documentation →
          </Link>
        </div>
      </div>
    </div>
  );
}
