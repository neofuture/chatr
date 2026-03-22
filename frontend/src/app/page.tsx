'use client';

import Image from 'next/image';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { useBodyScroll } from '@/components/site/useBodyScroll';
import s from '@/components/site/Site.module.css';

const SS = '/screenshots';

export default function HomePage() {
  useBodyScroll();

  return (
    <div className={s.page}>
      <SiteNav />

      {/* ── Hero ──────────────────────────────────────── */}
      <section className={s.heroSection}>
        <div className={s.heroGradient} />
        <div className={s.heroInner}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Image
              src="/images/logo-horizontal.png"
              alt="Chatr"
              width={360}
              height={120}
              style={{ width: 360, height: 'auto' }}
              priority
            />
          </div>
          <div className={s.heroTag} style={{ marginTop: '1.5rem' }}>Open Source Real-Time Messaging Platform</div>
          <h1 className={s.heroH1}>
            Connect. Chat. <span className={s.accent}>Collaborate.</span>
          </h1>
          <p className={s.heroP}>
            A free, open source messaging platform with voice notes, video, file sharing, AI assistant,
            typing indicators, read receipts, and an embeddable support widget — clone, deploy, and make it yours.
          </p>
          <div className={s.heroCtas}>
            <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
              <i className="fab fa-github" /> View on GitHub
            </a>
            <Link href="/features" className={s.btnSecondary}>
              <i className="fas fa-th-large" /> Explore Features
            </Link>
            <Link href="/docs" className={s.btnSecondary}>
              <i className="fas fa-book" /> Documentation
            </Link>
          </div>
        </div>

        <div className={s.screenshotRow} style={{ marginTop: '3rem' }}>
          <Image src={`${SS}/03-conversations.png`} alt="Conversations" width={220} height={440}
            className={s.screenshotMobile} style={{ width: 220, height: 'auto' }} priority />
          <Image src={`${SS}/04-chat-view.png`} alt="Chat" width={220} height={440}
            className={s.screenshotMobile} style={{ width: 220, height: 'auto' }} priority />
          <Image src={`${SS}/20-luna-chat.png`} alt="AI Assistant" width={220} height={440}
            className={s.screenshotMobile} style={{ width: 220, height: 'auto' }} priority />
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.statsRow}>
            {[['100%', 'Open Source'], ['50+', 'Features'], ['2,700+', 'Automated Tests'], ['82,000+', 'Lines of Code']].map(([v, l]) => (
              <div key={l} className={s.statBox}>
                <div className={s.statVal}>{v}</div>
                <div className={s.statLbl}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Feature highlights ────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <div className={s.sectionTag}>Why Chatr</div>
          <h2 className={s.sectionH2}>Everything you need, nothing you don't</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Seven message types, real-time indicators, group management, an AI chatbot,
            and an embeddable support widget — all in one platform.
          </p>
        </div>

        <div className={s.grid3}>
          {[
            { icon: 'fa-comments', color: s.iconBlue, title: 'Rich Messaging', text: 'Text, voice notes, images, video, files, code blocks, and link previews. Reactions, replies, edits, and unsend.' },
            { icon: 'fa-bolt', color: s.iconPurple, title: 'Real-Time Everything', text: 'Typing indicators, ghost typing, presence dots, read receipts, and recording indicators — all within 200ms.' },
            { icon: 'fa-users', color: s.iconGreen, title: 'Groups & Roles', text: 'Create groups with Owner, Admin, and Member roles. Invite by search, manage permissions, all message types.' },
            { icon: 'fa-robot', color: s.iconOrange, title: 'AI Assistant', text: 'Luna (GPT-4o-mini) appears as a regular contact. Typing indicators, conversation history, zero learning curve.' },
            { icon: 'fa-headset', color: s.iconRed, title: 'Support Widget', text: 'One line of JavaScript adds live chat to any website. White-label, zero-friction, replaces Intercom at £0/seat.' },
            { icon: 'fa-shield-alt', color: s.iconSlate, title: 'Enterprise Security', text: 'JWT + 2FA + SMS verification. Per-field privacy controls. Redis rate limiting. Server-side enforcement.' },
          ].map(f => (
            <div key={f.title} className={s.card}>
              <div className={`${s.cardIcon} ${f.color}`}>
                <i className={`fas ${f.icon}`} />
              </div>
              <div className={s.cardTitle}>{f.title}</div>
              <div className={s.cardText}>{f.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Open Source banner ────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter} style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Free &amp; open source — forever</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
              Chatr is MIT-licensed. Clone the repo, deploy on your own infrastructure,
              and customise every line. No per-seat fees, no vendor lock-in, no strings attached.
            </p>
            <div className={s.heroCtas} style={{ marginTop: '1.25rem' }}>
              <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
                <i className="fab fa-github" /> Star on GitHub
              </a>
              <Link href="/pricing" className={s.btnSecondary}>
                <i className="fas fa-tag" /> Compare Options
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Widget callout ────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.grid2}>
            <div>
              <div className={s.sectionTag}>Embeddable Widget</div>
              <h2 className={s.sectionH2}>Add live support to any website</h2>
              <p className={s.sectionP}>
                Paste one line of JavaScript and your customers can chat with you in real time.
                No sign-up, no email, zero friction. Sessions persist for 24 hours.
              </p>
              <p className={s.sectionP} style={{ marginTop: '0.75rem' }}>
                A fully white-labelled Palette Designer lets you customise every colour, toggle dark mode,
                and copy the embed snippet with one click.
              </p>
              <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/widget" className={s.btnPrimary}>
                  <i className="fas fa-external-link-alt" /> Learn More
                </Link>
                <Link href="/contact" className={s.btnSecondary}>
                  <i className="fas fa-envelope" /> Talk to Us
                </Link>
              </div>
            </div>
            <div>
              <div className={s.screenshotRow}>
                <Image src={`${SS}/11-widget-intro.png`} alt="Widget" width={180} height={360}
                  className={s.screenshotMobile} style={{ width: 180, height: 'auto' }} />
                <Image src={`${SS}/11d-widget-conversation.png`} alt="Widget chat" width={180} height={360}
                  className={s.screenshotMobile} style={{ width: 180, height: 'auto' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dark/Light themes ─────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <div className={s.sectionTag}>Beautiful Design</div>
          <h2 className={s.sectionH2}>Dark & light themes, mobile-first</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Every pixel designed for mobile. Responsive layout adapts to desktop with a persistent sidebar.
            Switch themes with one tap — no reload, no flicker.
          </p>
        </div>
        <div className={s.screenshotRow} style={{ marginTop: '2rem' }}>
          <Image src={`${SS}/18-dark-theme.png`} alt="Dark theme" width={180} height={360}
            className={s.screenshotMobile} style={{ width: 180, height: 'auto' }} />
          <Image src={`${SS}/27-dark-theme-chat.png`} alt="Dark chat" width={180} height={360}
            className={s.screenshotMobile} style={{ width: 180, height: 'auto' }} />
          <Image src={`${SS}/19-light-theme.png`} alt="Light theme" width={180} height={360}
            className={s.screenshotMobile} style={{ width: 180, height: 'auto' }} />
          <Image src={`${SS}/36-light-theme-chat.png`} alt="Light chat" width={180} height={360}
            className={s.screenshotMobile} style={{ width: 180, height: 'auto' }} />
        </div>
      </div>

      {/* ── Tech stack ────────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <div className={s.sectionTag}>Production Ready &amp; Open Source</div>
            <h2 className={s.sectionH2}>Built on the stack trusted by Slack, Shopify &amp; Netflix</h2>
          </div>
          <div className={s.techGrid}>
            {[
              { label: 'Frontend', name: 'Next.js 16 + React 19', desc: 'TypeScript strict mode, Framer Motion, Socket.IO' },
              { label: 'Backend', name: 'Node.js + Express', desc: '85+ REST endpoints, 100+ WebSocket events' },
              { label: 'Database', name: 'PostgreSQL 16', desc: 'Prisma ORM, 9 models, automatic migrations' },
              { label: 'Caching', name: 'Redis 7', desc: 'Presence, rate limiting, pub/sub, token blacklisting' },
              { label: 'AI', name: 'OpenAI GPT-4o-mini', desc: 'Chatbot (Luna) + conversation summaries' },
              { label: 'Cloud', name: 'AWS', desc: 'EC2, RDS, ElastiCache, S3, Nginx' },
            ].map(t => (
              <div key={t.label} className={s.techCard}>
                <div className={s.techLabel}>{t.label}</div>
                <div className={s.techName}>{t.name}</div>
                <div className={s.techDesc}>{t.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <Link href="/technology" className={s.btnSecondary}>
              <i className="fas fa-code" /> Full Architecture →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Dashboard preview ─────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <div className={s.sectionTag}>Developer Intelligence</div>
          <h2 className={s.sectionH2}>Real-time analytics dashboard</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            17+ live metrics, code health gauges, commit intelligence, security audit, and an embedded test runner.
          </p>
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Image src={`${SS}/10-dashboard-top.png`} alt="Dashboard" width={900} height={500}
            className={s.screenshotWide} style={{ width: '100%', maxWidth: 900, height: 'auto' }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/dashboard" className={s.btnSecondary}>
            <i className="fas fa-chart-line" /> View Live Dashboard
          </Link>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <h2 className={s.sectionH2}>Ready to get started?</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              50+ features, 2,700+ tests, MIT-licensed. Clone the repo and deploy your own instance in minutes.
            </p>
            <div className={s.heroCtas} style={{ marginTop: '1.5rem' }}>
              <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
                <i className="fab fa-github" /> Get the Source
              </a>
              <Link href="/product" className={s.btnSecondary}>
                <i className="fas fa-file-alt" /> Full Product Overview
              </Link>
              <Link href="/docs" className={s.btnSecondary}>
                <i className="fas fa-book" /> Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
