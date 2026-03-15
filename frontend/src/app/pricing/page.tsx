'use client';

import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { useBodyScroll } from '@/components/site/useBodyScroll';
import s from '@/components/site/Site.module.css';

const INTERCOM_ITEMS = [
  { icon: 'fas fa-pound-sign', text: '£39–99 per seat, per month' },
  { icon: 'fas fa-ban', text: 'Usage caps and overage charges' },
  { icon: 'fas fa-lock', text: 'Vendor lock-in — no source access' },
  { icon: 'fas fa-paint-brush', text: 'Limited customisation options' },
  { icon: 'fas fa-server', text: 'Your data on their servers' },
  { icon: 'fas fa-credit-card', text: 'Monthly bills that never stop' },
];

const CHATR_ITEMS = [
  { icon: 'fas fa-code', text: 'Full source code — yours forever' },
  { icon: 'fas fa-users', text: 'Unlimited seats, zero per-user fees' },
  { icon: 'fas fa-palette', text: 'Complete white-label customisation' },
  { icon: 'fas fa-database', text: 'Runs on your own servers' },
  { icon: 'fas fa-infinity', text: 'No recurring cost, ever' },
  { icon: 'fas fa-sliders-h', text: 'Full customisation — change anything' },
  { icon: 'fas fa-check-double', text: 'All features included from day one' },
];

const BUILD_ITEMS = [
  { icon: 'fas fa-calendar', text: '3–6 months of development time' },
  { icon: 'fas fa-network-wired', text: 'WebSocket infrastructure from scratch' },
  { icon: 'fas fa-shield-alt', text: 'Authentication & security system' },
  { icon: 'fas fa-file-upload', text: 'File handling & media pipeline' },
  { icon: 'fas fa-vial', text: 'Testing across three tiers' },
  { icon: 'fas fa-wrench', text: 'Ongoing maintenance & bug fixes' },
];

const INCLUDES = [
  { icon: 'fas fa-comments', color: s.iconBlue, title: '50+ Features', text: 'Real-time messaging, voice notes, video, file sharing, reactions, replies, typing indicators, and more.' },
  { icon: 'fas fa-vial', color: s.iconGreen, title: '1,300+ Tests', text: 'Three-tier automated testing — 855 frontend, 305 backend, 156 end-to-end with Playwright.' },
  { icon: 'fas fa-plug', color: s.iconPurple, title: 'Embeddable Widget', text: 'One line of code adds live customer support to any website. Replaces Intercom.' },
  { icon: 'fas fa-robot', color: s.iconOrange, title: 'AI Chatbot', text: 'Built-in GPT-4o-mini assistant and automatic conversation summaries.' },
  { icon: 'fas fa-fingerprint', color: s.iconRed, title: 'Enterprise Auth', text: 'Email, SMS, TOTP 2FA, password recovery, rate limiting, and token blacklisting.' },
  { icon: 'fas fa-chart-line', color: s.iconSlate, title: 'Real-Time Dashboard', text: 'Live metrics, code health gauges, commit intelligence, security audit, and test runner.' },
];

export default function PricingPage() {
  useBodyScroll();
  return (
    <div className={s.page}>
      <SiteNav />

      {/* Hero */}
      <section className={s.heroSection}>
        <div className={s.heroGradient} />
        <div className={s.heroInner}>
          <span className={s.heroTag}>Pricing</span>
          <h1 className={s.heroH1}>
            Zero cost. <span className={s.accent}>Full ownership.</span>
          </h1>
          <p className={s.heroP}>
            Stop paying per-seat fees for chat software you don&rsquo;t own. Chatr replaces
            expensive SaaS subscriptions with a production-ready platform you deploy once
            and keep forever.
          </p>
        </div>
      </section>

      {/* Pricing Comparison */}
      <div className={s.section}>
        <div className={`${s.sectionTag} ${s.sectionCenter}`}>Compare</div>
        <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Three paths to live chat</h2>
        <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
          Buy a SaaS subscription, build from scratch, or deploy Chatr for free.
        </p>

        <div className={s.pricingGrid}>
          {/* Intercom */}
          <div className={s.pricingCard}>
            <div className={s.pricingName}>Intercom</div>
            <div className={s.pricingPrice}>
              £39–99 <span className={s.pricingPeriod}>/seat/month</span>
            </div>
            <div className={s.pricingDesc}>Industry-standard SaaS — powerful, but expensive and locked down.</div>
            <ul className={s.pricingFeatures}>
              {INTERCOM_ITEMS.map((item, i) => (
                <li key={i}><i className={item.icon} /> {item.text}</li>
              ))}
            </ul>
          </div>

          {/* Chatr */}
          <div className={`${s.pricingCard} ${s.pricingFeatured}`}>
            <span className={s.pricingBadge}>Recommended</span>
            <div className={s.pricingName}>Chatr</div>
            <div className={s.pricingPrice}>
              £0 <span className={s.pricingPeriod}>/forever</span>
            </div>
            <div className={s.pricingDesc}>Full-featured, production-ready platform. Deploy once, own it forever.</div>
            <ul className={s.pricingFeatures}>
              {CHATR_ITEMS.map((item, i) => (
                <li key={i}><i className={item.icon} /> {item.text}</li>
              ))}
            </ul>
            <Link href="/contact" className={s.btnPrimary} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              <i className="fas fa-envelope" /> Get Started — Contact Us
            </Link>
          </div>

          {/* Build from Scratch */}
          <div className={s.pricingCard}>
            <div className={s.pricingName}>Build from Scratch</div>
            <div className={s.pricingPrice}>
              £50k–150k <span className={s.pricingPeriod}>/estimate</span>
            </div>
            <div className={s.pricingDesc}>Full control — but months of engineering before a single feature ships.</div>
            <ul className={s.pricingFeatures}>
              {BUILD_ITEMS.map((item, i) => (
                <li key={i}><i className={item.icon} /> {item.text}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* What You Get */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={`${s.sectionTag} ${s.sectionCenter}`}>Included</div>
          <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>What You Get</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
            Everything a funded engineering team would build — delivered as a complete, tested, deployable product.
          </p>

          <div className={s.grid3}>
            {INCLUDES.map((item, i) => (
              <div className={s.card} key={i}>
                <div className={`${s.cardIcon} ${item.color}`}>
                  <i className={item.icon} />
                </div>
                <div className={s.cardTitle}>{item.title}</div>
                <div className={s.cardText}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The Numbers */}
      <div className={s.section}>
        <div className={`${s.sectionTag} ${s.sectionCenter}`}>By the Numbers</div>
        <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>The Numbers</h2>
        <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
          A complete platform built, tested, and deployed by a single developer.
        </p>

        <div className={s.statsRow}>
          <div className={s.statBox}>
            <div className={s.statVal}>£0</div>
            <div className={s.statLbl}>Total Cost</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statVal}>50+</div>
            <div className={s.statLbl}>Features</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statVal}>22</div>
            <div className={s.statLbl}>Days Built</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statVal}>1,300+</div>
            <div className={s.statLbl}>Tests</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className={s.sectionAlt}>
        <div className={`${s.section} ${s.sectionCenter}`}>
          <h2 className={s.sectionH2}>Ready to get started?</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Deploy Chatr today — zero cost, full ownership, no strings attached.
          </p>
          <div className={s.heroCtas}>
            <Link href="/contact" className={s.btnPrimary}>
              <i className="fas fa-envelope" /> Contact Us
            </Link>
            <Link href="/product" className={s.btnSecondary}>
              Full Product Overview <i className="fas fa-book-open" />
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
