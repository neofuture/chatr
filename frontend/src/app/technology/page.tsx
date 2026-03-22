'use client';

import Image from 'next/image';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { useBodyScroll } from '@/components/site/useBodyScroll';
import s from '@/components/site/Site.module.css';

const SS = '/screenshots';

const STACK = [
  { label: 'Frontend', name: 'Next.js 16 + React 19', desc: 'TypeScript, App Router, Framer Motion animations, Socket.IO client, IndexedDB offline cache.' },
  { label: 'Backend', name: 'Node.js + Express', desc: 'TypeScript, 85+ REST endpoints, 100+ Socket.IO event types, file uploads, email & SMS services.' },
  { label: 'Database', name: 'PostgreSQL 16', desc: 'Prisma ORM with 9 models, type-safe queries, automatic migrations, indexed for fast lookups.' },
  { label: 'Caching', name: 'Redis 7', desc: 'Presence tracking, rate limiting, pub/sub across instances, token blacklisting, session management.' },
  { label: 'AI', name: 'OpenAI GPT-4o-mini', desc: 'Luna chatbot assistant, automatic conversation summaries, streaming token-by-token responses.' },
  { label: 'Cloud', name: 'AWS Infrastructure', desc: 'EC2 (PM2 cluster), RDS (managed Postgres), ElastiCache (Redis), S3 (media), Nginx reverse proxy.' },
];

const PIPELINE_STEPS = [
  { num: '1', title: 'Emit', desc: 'Client sends "message:send" via Socket.IO with content, type, and recipient.' },
  { num: '2', title: 'Validate', desc: 'Server validates auth, permissions, rate limits, and message payload.' },
  { num: '3', title: 'Persist', desc: 'Message written to PostgreSQL with sender, recipient, timestamp, and status.' },
  { num: '4', title: 'Deliver', desc: 'Server emits "message:new" to recipient\'s Socket room in real time.' },
  { num: '5', title: 'Acknowledge', desc: '"message:delivered" fires back to sender. UI updates from clock to tick.' },
  { num: '6', title: 'Read Receipt', desc: 'When message scrolls into view, "message:read" completes the cycle.' },
];

const MODELS = [
  { name: 'User', desc: 'Credentials, profile fields, settings, presence state, guest sessions, avatar and cover URLs.', icon: 'fas fa-user' },
  { name: 'Conversation', desc: 'DM thread between two users. Tracks last message timestamp for sort order.', icon: 'fas fa-comments' },
  { name: 'Message', desc: 'Content, type (text/voice/image/video/file), sender, recipient or group, status, reply ref.', icon: 'fas fa-envelope' },
  { name: 'Group', desc: 'Name, description, avatar, cover image, creation date, and metadata.', icon: 'fas fa-users' },
  { name: 'GroupMember', desc: 'Join table: user ↔ group with role (Owner, Admin, Member) and invite status.', icon: 'fas fa-user-tag' },
  { name: 'Friendship', desc: 'Bidirectional friend connection with status: pending, accepted, or blocked.', icon: 'fas fa-user-friends' },
  { name: 'Reaction', desc: 'Emoji reaction on a message by a user. Unique constraint prevents duplicates.', icon: 'fas fa-heart' },
  { name: 'MessageEditHistory', desc: 'Full edit audit trail — original content, new content, and timestamp per revision.', icon: 'fas fa-history' },
  { name: 'Session', desc: 'Active auth sessions for token management, refresh rotation, and multi-device support.', icon: 'fas fa-key' },
];

export default function TechnologyPage() {
  useBodyScroll();
  return (
    <div className={s.page}>
      <SiteNav />

      {/* Hero */}
      <section className={s.heroSection}>
        <div className={s.heroGradient} />
        <div className={s.heroInner}>
          <span className={s.heroTag}>Architecture</span>
          <h1 className={s.heroH1}>
            Built on <span className={s.accent}>proven technology</span>
          </h1>
          <p className={s.heroP}>
            React, Node.js, PostgreSQL, Redis, AWS — the same stack trusted by
            Slack, Netflix, and Uber. Any JavaScript developer can be productive on day one.
          </p>
          <div className={s.heroCtas}>
            <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
              <i className="fab fa-github" /> View on GitHub
            </a>
            <Link href="/features" className={s.btnSecondary}>
              <i className="fas fa-list" /> View Features
            </Link>
          </div>
        </div>
      </section>

      {/* The Stack */}
      <div className={s.section}>
        <div className={`${s.sectionTag} ${s.sectionCenter}`}>Technology</div>
        <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>The Stack</h2>
        <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
          Six layers of production-grade infrastructure, each chosen for reliability, performance, and developer familiarity.
        </p>

        <div className={s.techGrid}>
          {STACK.map((item, i) => (
            <div className={s.techCard} key={i}>
              <div className={s.techLabel}>{item.label}</div>
              <div className={s.techName}>{item.name}</div>
              <div className={s.techDesc}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Message Delivery Pipeline */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={`${s.sectionTag} ${s.sectionCenter}`}>Real-Time</div>
          <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Message Delivery Pipeline</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
            From keypress to read receipt in under 100ms. Six stages, fully observable, horizontally scalable.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.25rem',
            marginTop: '2.5rem',
          }}>
            {PIPELINE_STEPS.map((step) => (
              <div key={step.num} style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '12px',
                padding: '1.5rem',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '1rem',
                  background: 'var(--color-blue-500)',
                  color: 'white',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}>{step.num}</div>
                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.35rem' }}>{step.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>

          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`} style={{ marginTop: '2rem' }}>
            End-to-end delivery completes in under <strong>100ms</strong>. Offline messages are persisted
            in PostgreSQL and delivered automatically on reconnection. The Socket.IO Redis adapter
            enables horizontal scaling across multiple backend instances.
          </p>
        </div>
      </div>

      {/* Database Schema */}
      <div className={s.section}>
        <div className={`${s.sectionTag} ${s.sectionCenter}`}>Data Layer</div>
        <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Database Schema</h2>
        <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
          9 Prisma models with type-safe queries, automatic migrations, and indexed fields for fast lookups.
        </p>

        <div className={s.grid3}>
          {MODELS.map((model, i) => (
            <div className={s.card} key={i}>
              <div className={`${s.cardIcon} ${i < 3 ? s.iconBlue : i < 6 ? s.iconPurple : s.iconSlate}`}>
                <i className={model.icon} />
              </div>
              <div className={s.cardTitle}>{model.name}</div>
              <div className={s.cardText}>{model.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact CTA */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter} style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Built for production. Open source.</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
              Deploy on your own infrastructure with full source code access. MIT-licensed,
              zero recurring fees, open to contributions.
            </p>
            <div className={s.heroCtas} style={{ marginTop: '1.25rem' }}>
              <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
                <i className="fab fa-github" /> Star on GitHub
              </a>
              <Link href="/docs" className={s.btnSecondary}>
                <i className="fas fa-book" /> Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quality Assurance */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={`${s.sectionTag} ${s.sectionCenter}`}>Testing</div>
          <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Quality Assurance</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
            Over 2,700 automated tests across three tiers — every component, endpoint, and user flow is covered.
          </p>

          <div className={s.statsRow}>
            <div className={s.statBox}>
              <div className={s.statVal}>2,700+</div>
              <div className={s.statLbl}>Total Tests</div>
            </div>
            <div className={s.statBox}>
              <div className={s.statVal}>1,475</div>
              <div className={s.statLbl}>Frontend</div>
            </div>
            <div className={s.statBox}>
              <div className={s.statVal}>1,133</div>
              <div className={s.statLbl}>Backend</div>
            </div>
            <div className={s.statBox}>
              <div className={s.statVal}>85</div>
              <div className={s.statLbl}>End-to-End</div>
            </div>
          </div>

          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`} style={{ marginTop: '2rem' }}>
            Frontend tests cover every React component, hook, context, and page at 99% coverage.
            Backend tests validate every API endpoint, auth flow, Socket handler, and service integration.
            End-to-end tests use Playwright driving Desktop Chrome and iPhone 14 with two simultaneous
            users verifying real-time delivery, typing indicators, and presence.
          </p>
        </div>
      </div>

      {/* Developer Dashboard */}
      <div className={s.section}>
        <div className={`${s.sectionTag} ${s.sectionCenter}`}>Observability</div>
        <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Developer Dashboard</h2>
        <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
          Custom-built project intelligence with live metrics, code health gauges, commit intelligence,
          security auditing, and an embedded test runner — all auto-refreshing in real time.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', marginTop: '2.5rem' }}>
          <Image
            src={`${SS}/10-dashboard-top.png`}
            alt="Dashboard — metric cards, code health gauges, commit intelligence"
            width={1000}
            height={600}
            className={s.screenshotWide}
            style={{ width: '100%', maxWidth: '900px', height: 'auto' }}
          />
          <div className={s.screenshotCaption}>Dashboard — metric cards, code health gauges, commit intelligence</div>

          <Image
            src={`${SS}/09-dashboard-full.png`}
            alt="Full analytics dashboard"
            width={1000}
            height={1200}
            className={s.screenshotWide}
            style={{ width: '100%', maxWidth: '900px', height: 'auto' }}
          />
          <div className={s.screenshotCaption}>Full analytics dashboard — test runner, security audit, build health</div>
        </div>
      </div>

      {/* CTA */}
      <div className={s.sectionAlt}>
        <div className={`${s.section} ${s.sectionCenter}`}>
          <h2 className={s.sectionH2}>Explore the full platform</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Read the documentation, explore the dashboard, or see the complete product overview.
          </p>
          <div className={s.heroCtas}>
            <Link href="/docs" className={s.btnPrimary}>
              <i className="fas fa-book" /> Documentation
            </Link>
            <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
              <i className="fab fa-github" /> View on GitHub
            </a>
            <Link href="/dashboard" className={s.btnSecondary}>
              <i className="fas fa-chart-line" /> Dashboard
            </Link>
            <Link href="/product" className={s.btnSecondary}>
              <i className="fas fa-rocket" /> Product Overview
            </Link>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
