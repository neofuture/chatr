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
      <main id="main-content">

      {/* ── Hero ──────────────────────────────────────── */}
      <section className={s.heroSection}>
        <div className={s.heroGradient} aria-hidden="true" />
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
              <i className="fab fa-github" aria-hidden="true" /> View on GitHub
            </a>
            <Link href="/features" className={s.btnSecondary}>
              <i className="fas fa-th-large" aria-hidden="true" /> Explore Features
            </Link>
            <Link href="/docs" className={s.btnSecondary}>
              <i className="fas fa-book" aria-hidden="true" /> Documentation
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
            {[['100%', 'Open Source'], ['50+', 'Features'], ['2,800+', 'Automated Tests'], ['82,000+', 'Lines of Code']].map(([v, l]) => (
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
                <i className={`fas ${f.icon}`} aria-hidden="true" />
              </div>
              <div className={s.cardTitle}>{f.title}</div>
              <div className={s.cardText}>{f.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3 steps to deploy ────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <div className={s.sectionTag}>Quick Start</div>
            <h2 className={s.sectionH2}>Running in under 60 seconds</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              Three commands. That&rsquo;s it. Docker handles the databases, the dev script handles the rest.
            </p>
          </div>

          <div className={s.grid3} style={{ marginTop: '2rem' }}>
            <div className={s.card} style={{ textAlign: 'center' }}>
              <div className={`${s.cardIcon} ${s.iconBlue}`} style={{ margin: '0 auto 1rem' }}>
                <i className="fas fa-clone" aria-hidden="true" />
              </div>
              <div className={s.cardTitle}>1. Clone</div>
              <div className={s.cardText}>
                <code style={{ fontSize: '0.82rem', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                  git clone github.com/neofuture/chatr
                </code>
              </div>
            </div>
            <div className={s.card} style={{ textAlign: 'center' }}>
              <div className={`${s.cardIcon} ${s.iconPurple}`} style={{ margin: '0 auto 1rem' }}>
                <i className="fas fa-cog" aria-hidden="true" />
              </div>
              <div className={s.cardTitle}>2. Configure</div>
              <div className={s.cardText}>
                <code style={{ fontSize: '0.82rem', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                  cp .env.example .env
                </code>
              </div>
            </div>
            <div className={s.card} style={{ textAlign: 'center' }}>
              <div className={`${s.cardIcon} ${s.iconGreen}`} style={{ margin: '0 auto 1rem' }}>
                <i className="fas fa-play" aria-hidden="true" />
              </div>
              <div className={s.cardTitle}>3. Launch</div>
              <div className={s.cardText}>
                <code style={{ fontSize: '0.82rem', background: 'var(--bg-tertiary)', padding: '0.2rem 0.5rem', borderRadius: 6 }}>
                  bash dev.sh
                </code>
              </div>
            </div>
          </div>

          <div className={s.highlight}>
            <p>
              <strong>What dev.sh does:</strong> Starts Docker (PostgreSQL + Redis), runs database migrations,
              launches 5 development servers (frontend, backend, widget, CSS watcher, cache invalidator), and
              opens the app — all with hot reload. One command replaces 15 minutes of manual setup.
            </p>
          </div>
        </div>
      </div>

      {/* ── AI Showcase ──────────────────────────────── */}
      <div className={s.section}>
        <div className={s.grid2}>
          <div>
            <div className={s.sectionTag}>Artificial Intelligence</div>
            <h2 className={s.sectionH2}>Meet Luna — your AI assistant</h2>
            <p className={s.sectionP}>
              Luna is an AI chatbot powered by GPT-4o-mini that appears as a regular contact in your
              conversation list. No special UI, no learning curve — just message her like anyone else.
            </p>
            <ul className={s.checkList}>
              <li><i className="fas fa-check" aria-hidden="true" /> Streaming token-by-token responses</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Typing indicators while &ldquo;thinking&rdquo;</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Full conversation history &amp; context</li>
              <li><i className="fas fa-check" aria-hidden="true" /> AI-generated conversation summaries</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Code help, brainstorming, Q&amp;A</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Swap model via environment variable</li>
            </ul>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Image src={`${SS}/20-luna-chat.png`} alt="Luna AI chatbot" width={240} height={480}
              className={s.screenshotMobile} style={{ width: 240, height: 'auto' }} />
          </div>
        </div>
      </div>

      {/* ── Who is Chatr for ───────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <div className={s.sectionTag}>Use Cases</div>
            <h2 className={s.sectionH2}>Who is Chatr for?</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              Whether you&rsquo;re a startup, agency, or enterprise — Chatr gives you a complete messaging platform
              you own, customise, and deploy on your terms.
            </p>
          </div>

          <div className={s.grid3}>
            {[
              { icon: 'fa-rocket', color: s.iconBlue, title: 'SaaS Companies', text: 'Embed the support widget on your product. Replace Intercom at £0/seat and own every line of code. White-label it to match your brand.' },
              { icon: 'fa-building', color: s.iconPurple, title: 'Internal Teams', text: 'Deploy a private messaging platform behind your firewall. Full control over data residency, compliance, and access. No third-party dependencies.' },
              { icon: 'fa-seedling', color: s.iconGreen, title: 'Startups & MVPs', text: 'Skip 6 months of development. Clone the repo, customise, and launch with 50+ features on day one. Focus your team on what makes you unique.' },
              { icon: 'fa-palette', color: s.iconOrange, title: 'Agencies & Freelancers', text: 'Offer live chat as a white-label service to your clients. Deploy unique instances per client with custom branding and domains.' },
              { icon: 'fa-graduation-cap', color: s.iconRed, title: 'Education & Learning', text: 'A complete full-stack reference implementation. TypeScript, React 19, Node.js, PostgreSQL, Redis, WebSockets, AI — all production-grade.' },
              { icon: 'fa-briefcase', color: s.iconSlate, title: 'Acquirers & Investors', text: 'A tested, documented, deployed product with 82,000+ lines of code and 2,800+ tests. Ready to integrate, resell, or build upon.' },
            ].map(f => (
              <div key={f.title} className={s.card}>
                <div className={`${s.cardIcon} ${f.color}`}>
                  <i className={`fas ${f.icon}`} aria-hidden="true" />
                </div>
                <div className={s.cardTitle}>{f.title}</div>
                <div className={s.cardText}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Embed code snippet ──────────────────────────── */}
      <div className={s.section}>
        <div className={s.grid2}>
          <div>
            <div className={s.sectionTag}>One Line of Code</div>
            <h2 className={s.sectionH2}>Add live chat in 30 seconds</h2>
            <p className={s.sectionP}>
              Paste a single &lt;script&gt; tag into any website. A floating chat bubble appears
              instantly. Visitors type a message; agents reply from the Chatr dashboard.
              No sign-up, no email capture — zero friction.
            </p>
            <ul className={s.checkList}>
              <li><i className="fas fa-check" aria-hidden="true" /> Works on any website</li>
              <li><i className="fas fa-check" aria-hidden="true" /> No visitor sign-up needed</li>
              <li><i className="fas fa-check" aria-hidden="true" /> White-label branding</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Voice, files &amp; link previews</li>
              <li><i className="fas fa-check" aria-hidden="true" /> 24h persistent sessions</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Replaces Intercom at £0</li>
            </ul>
          </div>
          <div className={s.codeBlock}>
            <div className={s.codeBlockLabel}>HTML</div>
            <pre><code>{`<!-- Add to any page -->
<script
  src="https://your-server.com/chatr.js"
  data-server="https://your-server.com"
  data-position="bottom-right"
  data-theme="dark"
  data-primary-color="#3b82f6"
  data-greeting="How can we help?"
></script>`}</code></pre>
          </div>
        </div>
      </div>

      {/* ── Open Source banner ────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter} style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Free code. Expert support from £15/hr.</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
              Chatr is MIT-licensed — clone, deploy, and customise for free. Need a hand with setup,
              deployment, or customisation? Our paid support starts at just £15/hour.
            </p>
            <div className={s.heroCtas} style={{ marginTop: '1.25rem' }}>
              <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
                <i className="fab fa-github" aria-hidden="true" /> Star on GitHub
              </a>
              <Link href="/pricing" className={s.btnSecondary}>
                <i className="fas fa-headset" aria-hidden="true" /> Support Plans
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
                  <i className="fas fa-external-link-alt" aria-hidden="true" /> Learn More
                </Link>
                <Link href="/contact" className={s.btnSecondary}>
                  <i className="fas fa-envelope" aria-hidden="true" /> Talk to Us
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

      {/* ── Screenshot gallery ─────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <div className={s.sectionTag}>The Full Experience</div>
            <h2 className={s.sectionH2}>Every screen, polished</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              Registration, conversations, groups, friends, profiles, settings, emoji picker, reactions,
              replies, code blocks, and more — every screen is designed and tested.
            </p>
          </div>
          <div className={s.screenshotRow} style={{ marginTop: '2rem' }}>
            <Image src={`${SS}/02-login.png`} alt="Login" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/30-register-form.png`} alt="Register" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/03-conversations.png`} alt="Conversations" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/05-friends.png`} alt="Friends" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/06-groups.png`} alt="Groups" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/08-profile.png`} alt="Profile" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
          </div>
          <div className={s.screenshotRow} style={{ marginTop: '1rem' }}>
            <Image src={`${SS}/23-group-chat.png`} alt="Group chat" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/42-reactions.png`} alt="Reactions" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/43-reply-thread.png`} alt="Replies" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/22-emoji-picker.png`} alt="Emoji picker" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/41-code-block.png`} alt="Code blocks" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
            <Image src={`${SS}/32-image-lightbox.png`} alt="Image lightbox" width={160} height={320}
              className={s.screenshotMobile} style={{ width: 160, height: 'auto' }} />
          </div>
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
              { label: 'Backend', name: 'Node.js + Express', desc: '88 REST endpoints, 85+ WebSocket events' },
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
              <i className="fas fa-code" aria-hidden="true" /> Full Architecture →
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
          <a href="/dashboard" target="_blank" rel="noopener noreferrer" className={s.btnSecondary}>
            <i className="fas fa-chart-line" aria-hidden="true" /> View Live Dashboard
          </a>
        </div>
      </div>

      {/* ── Competitor comparison ─────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <div className={s.sectionTag}>Head to Head</div>
            <h2 className={s.sectionH2}>How Chatr stacks up</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              Feature-for-feature comparison with the biggest names in messaging and live chat.
            </p>
          </div>

          <table className={s.comparisonTable}>
            <caption className={s.srOnly}>Feature comparison between Chatr, Intercom, Zendesk, and Drift</caption>
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col" className={s.featuredCol}>Chatr</th>
                <th scope="col">Intercom</th>
                <th scope="col">Zendesk</th>
                <th scope="col">Drift</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Real-time messaging', true, true, true, true],
                ['Voice messages', true, false, false, false],
                ['Video sharing', true, false, false, false],
                ['File sharing (50 MB)', true, true, true, true],
                ['Code blocks with syntax highlighting', true, false, false, false],
                ['Link previews (Open Graph)', true, true, false, false],
                ['Typing indicators', true, true, true, true],
                ['Ghost typing (live keystrokes)', true, false, false, false],
                ['Read receipts (3-state)', true, true, 'partial', false],
                ['AI chatbot (GPT-4o-mini)', true, 'paid', 'paid', 'paid'],
                ['Conversation summaries (AI)', true, 'paid', false, false],
                ['Group chats with roles', true, false, false, false],
                ['Friend system & blocking', true, false, false, false],
                ['Embeddable support widget', true, true, true, true],
                ['White-label widget branding', true, 'paid', 'partial', 'partial'],
                ['TOTP 2FA', true, true, true, false],
                ['SMS verification', true, false, false, false],
                ['Per-field privacy controls', true, false, false, false],
                ['Dark & light themes', true, false, 'partial', false],
                ['Offline message queue', true, false, false, false],
                ['Self-hosted / on-premise', true, false, false, false],
                ['Full source code access', true, false, false, false],
                ['No per-seat pricing', true, false, false, false],
                ['MIT license', true, false, false, false],
              ].map(([feature, chatr, intercom, zendesk, drift]) => (
                <tr key={feature as string}>
                  <td>{feature as string}</td>
                  {[chatr, intercom, zendesk, drift].map((val, i) => (
                    <td key={i} className={i === 0 ? s.featuredCol : undefined}>
                      {val === true ? <span className={s.cellYes}><i className="fas fa-check" aria-hidden="true" /><span className={s.srOnly}>Yes</span></span> :
                       val === false ? <span className={s.cellNo}><i className="fas fa-times" aria-hidden="true" /><span className={s.srOnly}>No</span></span> :
                       <span className={s.cellPartial}>{val}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Everything included ─────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <div className={s.sectionTag}>Complete Platform</div>
          <h2 className={s.sectionH2}>50+ features. All included. Day one.</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            No feature gating, no premium tiers, no &ldquo;contact sales&rdquo;. Every feature ships with the repo.
          </p>
        </div>

        <ul className={s.featureCheckGrid}>
          {[
            'Text messaging', 'Voice messages with waveforms', 'Image sharing with lightbox',
            'Video sharing with player', 'File attachments (50 MB)', 'Code blocks (40+ languages)',
            'Link previews (Open Graph)', 'Emoji reactions', 'Message replies (quoted)',
            'Edit messages', 'Unsend / delete for everyone', 'Full emoji picker with search',
            'Typing indicators', 'Ghost typing (live keystrokes)', 'Online presence dots',
            'Read receipts (3-state)', 'Recording indicator', 'AI conversation summaries',
            'Group chats', 'Group roles (Owner/Admin/Member)', 'Group invitations',
            'Group avatars & covers', 'Friend requests & search', 'User blocking',
            'AI chatbot (Luna / GPT-4o-mini)', 'Streaming AI responses', 'Embeddable support widget',
            'Widget palette designer', 'Guest sessions (24h TTL)', 'White-label branding',
            'Dark theme (deep navy)', 'Light theme', 'One-tap theme toggle',
            'Email verification', 'SMS verification', 'TOTP two-factor auth',
            'Password recovery flow', 'JWT + refresh token auth', 'Token blacklisting',
            'Redis rate limiting', 'Per-field privacy controls', 'Profile system (avatar, bio, cover)',
            'Settings panel', 'Notification preferences', 'Date separators & grouping',
            'Offline message queue', 'IndexedDB cache', 'Responsive mobile-first UI',
            'Real-time dashboard', 'Code health gauges', 'Security audit panel',
            'Embedded test runner', 'Commit intelligence', 'Swagger API docs',
          ].map(f => (
            <li key={f}><i className="fas fa-check-circle" aria-hidden="true" /> {f}</li>
          ))}
        </ul>
      </div>

      {/* ── Built by one developer ──────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <div className={s.sectionTag}>The Story</div>
            <h2 className={s.sectionH2}>Built by one developer. In 30 days.</h2>
          </div>

          <div className={s.bigQuote}>
            A complete, production-deployed messaging platform — with real-time WebSockets, AI integration,
            enterprise auth, an embeddable widget, and 2,800+ automated tests — designed, built, tested,
            documented, and deployed by a single developer in 30 days.
            <div className={s.bigQuoteAttr}>— The kind of output that demonstrates what focused, senior-level engineering looks like.</div>
          </div>

          <div className={s.metricStrip}>
            <div className={s.metricBadge}>
              <i className="fas fa-code" aria-hidden="true" />
              <div className={s.metricBadgeText}>
                <span className={s.metricBadgeVal}>82,000+</span>
                <span className={s.metricBadgeLbl}>Lines of Code</span>
              </div>
            </div>
            <div className={s.metricBadge}>
              <i className="fas fa-vial" aria-hidden="true" />
              <div className={s.metricBadgeText}>
                <span className={s.metricBadgeVal}>2,800+</span>
                <span className={s.metricBadgeLbl}>Automated Tests</span>
              </div>
            </div>
            <div className={s.metricBadge}>
              <i className="fas fa-code-branch" aria-hidden="true" />
              <div className={s.metricBadgeText}>
                <span className={s.metricBadgeVal}>243</span>
                <span className={s.metricBadgeLbl}>Commits</span>
              </div>
            </div>
            <div className={s.metricBadge}>
              <i className="fas fa-file-code" aria-hidden="true" />
              <div className={s.metricBadgeText}>
                <span className={s.metricBadgeVal}>432</span>
                <span className={s.metricBadgeLbl}>Source Files</span>
              </div>
            </div>
            <div className={s.metricBadge}>
              <i className="fas fa-plug" aria-hidden="true" />
              <div className={s.metricBadgeText}>
                <span className={s.metricBadgeVal}>88</span>
                <span className={s.metricBadgeLbl}>API Endpoints</span>
              </div>
            </div>
            <div className={s.metricBadge}>
              <i className="fas fa-bolt" aria-hidden="true" />
              <div className={s.metricBadgeText}>
                <span className={s.metricBadgeVal}>85+</span>
                <span className={s.metricBadgeLbl}>Socket Events</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Commercial Value ───────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <div className={s.sectionTag}>Commercial Opportunity</div>
            <h2 className={s.sectionH2}>What would this cost to build?</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              A messaging platform of this scope — real-time, AI-integrated, fully tested, and deployed — would
              typically require a funded team and 6–12 months of development.
            </p>
          </div>

          <div className={s.grid4}>
            <div className={s.valueCard}>
              <div className={s.valueStat}>£150k+</div>
              <div className={s.valueTitle}>Build Cost</div>
              <div className={s.valueText}>Estimated agency or team cost to build equivalent features from scratch.</div>
            </div>
            <div className={s.valueCard}>
              <div className={s.valueStat}>£4,700</div>
              <div className={s.valueTitle}>Annual Savings</div>
              <div className={s.valueText}>vs. Intercom for a 10-person team at £39/seat/month. Scales linearly.</div>
            </div>
            <div className={s.valueCard}>
              <div className={s.valueStat}>30 days</div>
              <div className={s.valueTitle}>Time to Build</div>
              <div className={s.valueText}>Entire platform built, tested, and deployed by a single developer.</div>
            </div>
            <div className={s.valueCard}>
              <div className={s.valueStat}>£0</div>
              <div className={s.valueTitle}>Recurring Cost</div>
              <div className={s.valueText}>MIT-licensed. No per-seat fees, no usage caps, no vendor lock-in.</div>
            </div>
          </div>

          <div className={s.highlight}>
            <p>
              <strong>For acquirers:</strong> Chatr represents production-ready IP with immediate commercial
              value. The embeddable widget alone competes with Intercom (£39–99/seat/month), and the full platform
              includes AI integration, enterprise authentication, and a three-tier test suite — all documented,
              deployed, and ready to integrate or resell.
            </p>
          </div>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <h2 className={s.sectionH2}>Ready to get started?</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              50+ features, 2,800+ tests, MIT-licensed. Clone the repo and deploy for free — or get
              expert help from £15/hour.
            </p>
            <div className={s.heroCtas} style={{ marginTop: '1.5rem' }}>
              <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
                <i className="fab fa-github" aria-hidden="true" /> Get the Source
              </a>
              <Link href="/pricing" className={s.btnSecondary}>
                <i className="fas fa-headset" aria-hidden="true" /> Support Plans
              </Link>
              <Link href="/product" className={s.btnSecondary}>
                <i className="fas fa-file-alt" aria-hidden="true" /> Full Product Overview
              </Link>
              <Link href="/docs" className={s.btnSecondary}>
                <i className="fas fa-book" aria-hidden="true" /> Documentation
              </Link>
              <Link href="/contact" className={s.btnSecondary}>
                <i className="fas fa-envelope" aria-hidden="true" /> Discuss Acquisition
              </Link>
            </div>
          </div>
        </div>
      </div>

      </main>
      <SiteFooter />
    </div>
  );
}
