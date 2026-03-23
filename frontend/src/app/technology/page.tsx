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

      {/* Developer Experience */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={`${s.sectionTag} ${s.sectionCenter}`}>Developer Experience</div>
          <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Built for developers, by a developer</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
            Every tooling decision was made to maximise developer productivity. One command to start,
            strict types everywhere, and tests that run in seconds.
          </p>

          <div className={s.grid3}>
            {[
              { icon: 'fa-terminal', color: s.iconBlue, title: 'One Command Setup', text: 'Run bash dev.sh — Docker spins up PostgreSQL and Redis, migrations run, all five servers start with hot reload. Ready in under 60 seconds.' },
              { icon: 'fa-shield-alt', color: s.iconPurple, title: 'TypeScript Strict Mode', text: 'Every file — frontend, backend, and widget — is strict TypeScript. No implicit any, full type inference, and Prisma-generated types for the database.' },
              { icon: 'fa-vial', color: s.iconGreen, title: 'Three-Tier Testing', text: '2,700+ tests across Jest (unit/integration) and Playwright (E2E). 99% frontend coverage. Tests run in parallel and complete in under 30 seconds.' },
              { icon: 'fa-sync', color: s.iconOrange, title: 'Hot Reload Everything', text: 'Frontend (Next.js Fast Refresh), backend (nodemon), and widget (esbuild watcher) — all live-reload on save. No manual restarts.' },
              { icon: 'fa-code-branch', color: s.iconRed, title: 'Git Hooks & CI', text: 'Husky pre-commit runs all tests, auto-increments version, updates changelog, and triggers AWS deploy. Every commit is validated.' },
              { icon: 'fa-tachometer-alt', color: s.iconSlate, title: 'Live Dashboard', text: 'Custom-built analytics dashboard with code health gauges, test runner, security audit, and commit intelligence. All auto-refreshing.' },
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

          <div className={s.codeBlock} style={{ maxWidth: 600, margin: '2rem auto 0' }}>
            <div className={s.codeBlockLabel}>Terminal</div>
            <pre><code>{`git clone https://github.com/neofuture/chatr.git
cd chatr
cp .env.example .env
bash dev.sh

# ✅ PostgreSQL + Redis running (Docker)
# ✅ Migrations applied
# ✅ Frontend on localhost:3000
# ✅ Backend on localhost:3001
# ✅ Widget dev server on localhost:3003
# ✅ All watchers active`}</code></pre>
          </div>
        </div>
      </div>

      {/* API Examples */}
      <div className={s.section}>
        <div className={`${s.sectionTag} ${s.sectionCenter}`}>REST API</div>
        <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>85+ Endpoints, Fully Documented</h2>
        <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
          Every endpoint is documented in Swagger UI. Authentication, messaging, groups, files, AI — all
          accessible via standard REST with JWT auth.
        </p>

        <div className={s.grid2}>
          <div className={s.codeBlock}>
            <div className={s.codeBlockLabel}>Send a Message</div>
            <pre><code>{`POST /api/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "abc-123",
  "content": "Hello from the API!",
  "type": "text"
}

// → 201 Created
// Real-time delivery via WebSocket`}</code></pre>
          </div>
          <div className={s.codeBlock}>
            <div className={s.codeBlockLabel}>WebSocket Events</div>
            <pre><code>{`import { io } from "socket.io-client";

const socket = io("https://your-server.com", {
  auth: { token: "Bearer <jwt>" }
});

socket.on("message:new", (msg) => {
  console.log("New message:", msg);
});

socket.on("user:typing", ({ userId }) => {
  showTypingIndicator(userId);
});`}</code></pre>
          </div>
        </div>

        <div className={s.highlight}>
          <p>
            <strong>Interactive API docs:</strong> Full Swagger UI is available at <code>/api-docs</code> on
            any running instance. Explore, test, and integrate directly from your browser.
          </p>
        </div>
      </div>

      {/* Scalability & Infrastructure */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={`${s.sectionTag} ${s.sectionCenter}`}>Infrastructure</div>
          <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Scales without rewriting</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
            Designed for production from day one. Horizontal scaling, managed databases, and battle-tested
            infrastructure patterns used by teams at every scale.
          </p>

          <div className={s.grid3}>
            {[
              { icon: 'fa-server', color: s.iconBlue, title: 'PM2 Cluster Mode', text: 'Backend runs in cluster mode across all CPU cores. Add instances behind a load balancer for horizontal scaling — no code changes.' },
              { icon: 'fa-database', color: s.iconPurple, title: 'Managed PostgreSQL (RDS)', text: 'Automated backups, point-in-time recovery, read replicas for scaling reads. Prisma handles connection pooling.' },
              { icon: 'fa-bolt', color: s.iconGreen, title: 'Redis Adapter (ElastiCache)', text: 'Socket.IO Redis adapter enables WebSocket events across multiple backend instances. Managed Redis with failover.' },
              { icon: 'fa-cloud', color: s.iconOrange, title: 'S3 Media Storage', text: 'All uploaded files stored in S3 with server-side processing (Sharp for images). CDN-ready URLs, unlimited storage.' },
              { icon: 'fa-shield-alt', color: s.iconRed, title: 'Nginx Reverse Proxy', text: 'SSL termination, WebSocket proxying, gzip compression, and static asset caching. Let\'s Encrypt auto-renewal.' },
              { icon: 'fa-sync-alt', color: s.iconSlate, title: 'Zero-Downtime Deploy', text: 'PM2 handles rolling restarts. Deploy new code while existing connections stay active. No maintenance windows.' },
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
      </div>

      {/* Security */}
      <div className={s.section}>
        <div className={`${s.sectionTag} ${s.sectionCenter}`}>Security</div>
        <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Enterprise-grade security at every layer</h2>
        <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
          Not bolted on as an afterthought. Authentication, authorisation, and data protection are built
          into the architecture from the ground up.
        </p>

        <div className={s.grid3}>
          {[
            { icon: 'fa-key', color: s.iconBlue, title: 'JWT + Refresh Tokens', text: 'Short-lived access tokens with secure HTTP-only refresh tokens. Automatic rotation, server-side blacklisting on logout.' },
            { icon: 'fa-mobile-alt', color: s.iconPurple, title: 'Multi-Factor Auth', text: 'Email verification, SMS codes (The SMS Works), and TOTP authenticator apps. Users choose their security level.' },
            { icon: 'fa-tachometer-alt', color: s.iconGreen, title: 'Redis Rate Limiting', text: 'Per-endpoint, per-user rate limits enforced via Redis. Prevents brute-force, spam, and API abuse.' },
            { icon: 'fa-user-shield', color: s.iconOrange, title: 'Server-Side Enforcement', text: 'Every permission check happens server-side. The frontend is a UI layer — all business logic is authoritative on the backend.' },
            { icon: 'fa-lock', color: s.iconRed, title: 'Input Validation & Sanitisation', text: 'All user input validated and sanitised server-side. SQL injection, XSS, and CSRF protections throughout.' },
            { icon: 'fa-eye-slash', color: s.iconSlate, title: 'Granular Privacy Controls', text: 'Users control visibility of online status, last seen, profile info, and read receipts on a per-field basis.' },
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

      {/* Deployment Options */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={`${s.sectionTag} ${s.sectionCenter}`}>Deployment</div>
          <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Deploy anywhere</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
            Run locally with Docker, deploy to AWS with one command, or host on any cloud provider.
            The stack is standard — no proprietary lock-in.
          </p>

          <div className={s.grid3}>
            <div className={s.card} style={{ textAlign: 'center' }}>
              <div className={`${s.cardIcon} ${s.iconBlue}`} style={{ margin: '0 auto 1rem' }}><i className="fab fa-docker" /></div>
              <div className={s.cardTitle}>Local (Docker)</div>
              <div className={s.cardText}>
                <code style={{ fontSize: '0.82rem' }}>bash dev.sh</code> — Docker Compose spins up PostgreSQL and Redis.
                All servers start with hot reload. Development ready in under 60 seconds.
              </div>
            </div>
            <div className={s.card} style={{ textAlign: 'center' }}>
              <div className={`${s.cardIcon} ${s.iconOrange}`} style={{ margin: '0 auto 1rem' }}><i className="fab fa-aws" /></div>
              <div className={s.cardTitle}>AWS (Production)</div>
              <div className={s.cardText}>
                <code style={{ fontSize: '0.82rem' }}>bash aws.sh</code> — Deploys to EC2 with RDS, ElastiCache, S3, Nginx,
                SSL, and PM2 cluster mode.
              </div>
            </div>
            <div className={s.card} style={{ textAlign: 'center' }}>
              <div className={`${s.cardIcon} ${s.iconPurple}`} style={{ margin: '0 auto 1rem' }}><i className="fas fa-cloud" /></div>
              <div className={s.cardTitle}>Any Cloud</div>
              <div className={s.cardText}>
                Standard Node.js + PostgreSQL + Redis. Works on DigitalOcean, Hetzner, Railway, Render,
                Azure, GCP — anywhere that runs Docker or Node.js.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Project Structure */}
      <div className={s.section}>
        <div className={`${s.sectionTag} ${s.sectionCenter}`}>Codebase</div>
        <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Clean, modular project structure</h2>
        <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
          Three workspaces, strict TypeScript, and clear separation of concerns. Any developer
          can navigate the codebase in minutes.
        </p>

        <div className={s.grid3}>
          <div className={s.codeBlock}>
            <div className={s.codeBlockLabel}>Frontend</div>
            <pre><code>{`frontend/
├── src/app/          # Next.js pages
├── src/components/   # 186 React components
├── src/contexts/     # 9 React contexts
├── src/hooks/        # 15+ custom hooks
├── src/lib/          # Utilities & helpers
├── src/services/     # API & socket clients
└── 134 test files    # 99% coverage`}</code></pre>
          </div>
          <div className={s.codeBlock}>
            <div className={s.codeBlockLabel}>Backend</div>
            <pre><code>{`backend/
├── src/routes/       # 85+ REST endpoints
├── src/sockets/      # 100+ event handlers
├── src/services/     # Business logic
├── src/middleware/    # Auth, rate limiting
├── src/utils/        # Helpers & validators
├── prisma/           # 9 models, migrations
└── 27 test files     # 73% coverage`}</code></pre>
          </div>
          <div className={s.codeBlock}>
            <div className={s.codeBlockLabel}>Widget & Tooling</div>
            <pre><code>{`widget/
├── src/chatr.ts      # Standalone JS widget
├── src/styles/       # Scoped CSS
└── tests/            # 54 tests

e2e/
├── 14 spec files     # Playwright E2E
├── Desktop Chrome    # + iPhone 14
Documentation/        # Markdown guides
scripts/              # Dev & deploy tools`}</code></pre>
          </div>
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
