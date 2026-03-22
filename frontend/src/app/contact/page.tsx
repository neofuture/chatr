'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { useBodyScroll } from '@/components/site/useBodyScroll';
import s from '@/components/site/Site.module.css';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ContactPage() {
  useBodyScroll();
  const [form, setForm] = useState({ name: '', email: '', company: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch(`${API}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus('sent');
        setForm({ name: '', email: '', company: '', message: '' });
      } else {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Could not reach the server. Please try again later.');
      setStatus('error');
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  return (
    <div className={s.page}>
      <SiteNav />

      <section className={s.heroSection}>
        <div className={s.heroGradient} />
        <div className={s.heroInner}>
          <span className={s.heroTag}>Get in Touch</span>
          <h1 className={s.heroH1}>
            Let&rsquo;s talk <span className={s.accent}>business</span>
          </h1>
          <p className={s.heroP}>
            Need expert support at £15/hour, interested in acquiring the platform, or want to discuss
            a partnership? We&rsquo;d love to hear from you. For community support, open an issue on{' '}
            <a href="https://github.com/neofuture/chatr/issues" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-blue-400)' }}>GitHub</a>.
          </p>
        </div>
      </section>

      <div className={s.section}>
        <div className={s.contactGrid}>
          {/* Form */}
          <div>
            {status === 'sent' ? (
              <div style={{
                background: 'var(--overlay-green-20)',
                border: '1px solid var(--overlay-green-50)',
                borderRadius: 12,
                padding: '2.5rem',
                textAlign: 'center',
              }}>
                <i className="fas fa-check-circle" style={{ fontSize: '2.5rem', color: 'var(--color-green-500)', marginBottom: '1rem', display: 'block' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Message Sent</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Thanks for reaching out. We&rsquo;ll get back to you shortly.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className={s.btnSecondary}
                  style={{ marginTop: '1.25rem' }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Name <span style={{ color: 'var(--color-red-400)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={set('name')}
                    placeholder="Your full name"
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Email <span style={{ color: 'var(--color-red-400)' }}>*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@company.com"
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Company
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={set('company')}
                    placeholder="Your company (optional)"
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Message <span style={{ color: 'var(--color-red-400)' }}>*</span>
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={set('message')}
                    placeholder="I'm interested in acquiring/licensing Chatr, integrating the widget into our product, or discussing a commercial partnership..."
                    className="form-input"
                    style={{ resize: 'vertical', minHeight: 120 }}
                  />
                </div>

                {status === 'error' && (
                  <div style={{
                    background: 'var(--overlay-red-20)',
                    border: '1px solid var(--overlay-red-50)',
                    borderRadius: 8,
                    padding: '0.75rem 1rem',
                    fontSize: '0.85rem',
                    color: 'var(--color-red-400)',
                  }}>
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className={s.btnPrimary}
                  disabled={status === 'sending'}
                  style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem' }}
                >
                  {status === 'sending' ? (
                    <><i className="fas fa-spinner fa-spin" /> Sending...</>
                  ) : (
                    <><i className="fas fa-paper-plane" /> Send Message</>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Info sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconGreen}`}>
                <i className="fas fa-headset" />
              </div>
              <div className={s.cardTitle}>Paid Support — £15/hour</div>
              <div className={s.cardText}>
                Need help with setup, deployment, or customisation? Book expert time at £15/hour
                pay-as-you-go, or save with a{' '}
                <Link href="/pricing" style={{ color: 'var(--color-blue-400)' }}>monthly support plan</Link>.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconBlue}`}>
                <i className="fas fa-handshake" />
              </div>
              <div className={s.cardTitle}>Acquisition &amp; Licensing</div>
              <div className={s.cardText}>
                Interested in acquiring the IP, licensing the platform, or a commercial partnership?
                Let&rsquo;s talk numbers. Production-ready code, 2,700+ tests, full documentation.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconPurple}`}>
                <i className="fas fa-cogs" />
              </div>
              <div className={s.cardTitle}>Custom Development</div>
              <div className={s.cardText}>
                Need bespoke features, integrations, or a white-label deployment?
                We build it, you own it. Scoped and quoted per project.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconOrange}`}>
                <i className="fas fa-clock" />
              </div>
              <div className={s.cardTitle}>Quick Response</div>
              <div className={s.cardText}>
                We respond within 24 hours. Starter plan clients get 24-hour response;
                Professional plan clients get same-day response.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className={s.sectionAlt}>
        <div className={`${s.section} ${s.sectionCenter}`}>
          <h2 className={s.sectionH2}>Not ready to talk yet?</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Explore the platform at your own pace. Every feature is documented with screenshots.
          </p>
          <div className={s.heroCtas}>
            <Link href="/features" className={s.btnSecondary}>
              <i className="fas fa-th-large" /> Explore Features
            </Link>
            <Link href="/product" className={s.btnSecondary}>
              <i className="fas fa-book-open" /> Full Overview
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
