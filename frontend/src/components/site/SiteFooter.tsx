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
          <p>A free, open source real-time messaging platform with 50+ features, 2,700+ tests, and an embeddable support widget. MIT-licensed.</p>
        </div>

        <div className={s.col}>
          <div className={s.colTitle}>Product</div>
          <Link href="/features">Features</Link>
          <Link href="/widget">Support Widget</Link>
          <Link href="/pricing">Pricing &amp; Support</Link>
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
          <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer"><i className="fab fa-github" style={{ marginRight: 6 }} />GitHub</a>
          <Link href="/contact">Paid Support</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/app">Open App</Link>
          <button onClick={openRegister} className={s.footerBtn}>Create Account</button>
        </div>
      </div>

      <div className={s.bottom}>
        <span>&copy; {new Date().getFullYear()} Chatr. Built with React 19, Next.js 16, Node.js, PostgreSQL, Redis &amp; AWS.</span>
        <div className={s.stats}>
          <span className={s.stat}><span>82,000+</span> lines of code</span>
          <span className={s.stat}><span>2,700+</span> tests</span>
          <span className={s.stat}><span>30</span> days</span>
        </div>
      </div>
    </footer>
  );
}
