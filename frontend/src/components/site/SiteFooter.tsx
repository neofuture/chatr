'use client';

import Link from 'next/link';
import s from './SiteFooter.module.css';

export default function SiteFooter() {
  const openRegister = () => {
    window.dispatchEvent(new CustomEvent('chatr:open-auth', { detail: { view: 'register' } }));
  };

  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <div className={s.brand}>
          <h3>Chatr</h3>
          <p>A complete real-time messaging platform with 50+ features, 1,300+ tests, and an embeddable support widget — built by a single developer in 22 days.</p>
        </div>

        <div className={s.col}>
          <div className={s.colTitle}>Product</div>
          <Link href="/features">Features</Link>
          <Link href="/widget">Support Widget</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/product">Full Overview</Link>
        </div>

        <div className={s.col}>
          <div className={s.colTitle}>Technical</div>
          <Link href="/technology">Architecture</Link>
          <Link href="/docs">Documentation</Link>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/demo">Component Demos</Link>
        </div>

        <div className={s.col}>
          <div className={s.colTitle}>Get Started</div>
          <Link href="/contact">Contact Sales</Link>
          <Link href="/app">Open App</Link>
          <button onClick={openRegister} className={s.footerBtn}>Create Account</button>
        </div>
      </div>

      <div className={s.bottom}>
        <span>&copy; {new Date().getFullYear()} Chatr. Built with React 19, Next.js 16, Node.js, PostgreSQL, Redis &amp; AWS.</span>
        <div className={s.stats}>
          <span className={s.stat}><span>80,000+</span> lines of code</span>
          <span className={s.stat}><span>1,300+</span> tests</span>
          <span className={s.stat}><span>22</span> days</span>
        </div>
      </div>
    </footer>
  );
}
