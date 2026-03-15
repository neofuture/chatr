'use client';

import { useState, useEffect, useCallback, ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import SiteNav from '@/components/site/SiteNav';
import { useBodyScroll } from '@/components/site/useBodyScroll';
import s from './Product.module.css';

/* ── Navigation structure ──────────────────────────────────── */
const NAV = [
  { id: 'executive-summary', label: '1. Executive Summary' },
  { id: 'commercial-opportunity', label: '2. Commercial Opportunity' },
  { id: 'product-walkthrough', label: '3. Product Walkthrough',
    sub: [{ id: 'registration-login', label: '3.1 Registration & Login' }] },
  { id: 'messaging', label: '4. Messaging',
    sub: [
      { id: 'message-types', label: '4.1 Message Types' },
      { id: 'message-actions', label: '4.2 Message Actions' },
      { id: 'realtime-awareness', label: '4.3 Real-Time Awareness' },
      { id: 'offline-sync', label: '4.4 Offline & Sync' },
    ] },
  { id: 'groups-social', label: '5. Groups & Social' },
  { id: 'widget', label: '6. Support Widget',
    sub: [
      { id: 'widget-how', label: '6.1 How It Works' },
      { id: 'widget-customise', label: '6.2 Customisation' },
      { id: 'widget-tech', label: '6.3 Implementation' },
    ] },
  { id: 'ai', label: '7. AI Intelligence' },
  { id: 'security', label: '8. Security & Privacy',
    sub: [
      { id: 'auth-methods', label: '8.1 Auth Methods' },
      { id: 'privacy-controls', label: '8.2 Privacy Controls' },
      { id: 'rate-limiting', label: '8.3 Rate Limiting' },
    ] },
  { id: 'design-themes', label: '9. Design & Themes' },
  { id: 'profile', label: '10. Profile & Settings' },
  { id: 'architecture', label: '11. Architecture',
    sub: [
      { id: 'the-stack', label: '11.1 The Stack' },
      { id: 'realtime-infra', label: '11.2 Real-Time Infra' },
      { id: 'database-design', label: '11.3 Database Design' },
      { id: 'media-pipeline', label: '11.4 Media Pipeline' },
      { id: 'deployment', label: '11.5 Deployment' },
    ] },
  { id: 'quality', label: '12. Quality Assurance' },
  { id: 'dashboard', label: '13. Analytics Dashboard' },
  { id: 'devex', label: '14. Developer Experience' },
  { id: 'numbers', label: '15. By the Numbers' },
  { id: 'invest', label: '16. Why Invest' },
];

/* ── Helpers ────────────────────────────────────────────────── */
const SS = '/screenshots';

function Sec({ id, children }: { id: string; children: ReactNode }) {
  return <section id={id} className={s.section}>{children}</section>;
}
function H1({ children }: { children: ReactNode }) { return <h2 className={s.h1}>{children}</h2>; }
function H2({ children }: { children: ReactNode }) { return <h3 className={s.h2}>{children}</h3>; }
function H3({ children }: { children: ReactNode }) { return <h4 className={s.h3}>{children}</h4>; }
function P({ children, bold }: { children: ReactNode; bold?: boolean }) {
  return <p className={`${s.p} ${bold ? s.bold : ''}`}>{children}</p>;
}
function Tech({ children }: { children: ReactNode }) {
  return <p className={s.techNote}>{children}</p>;
}
function Callout({ children }: { children: ReactNode }) {
  return <div className={s.callout}>{children}</div>;
}

function Bullets({ items }: { items: { prefix?: string; text: string }[] }) {
  return (
    <ul className={s.bulletList}>
      {items.map((b, i) => (
        <li key={i} className={s.bullet}>
          {b.prefix && <span className={s.bulletPrefix}>{b.prefix} </span>}
          {b.text}
        </li>
      ))}
    </ul>
  );
}

function Img({ name, caption, wide }: { name: string; caption?: string; wide?: boolean }) {
  return (
    <div className={`${s.imgSingle} ${wide ? s.imgWide : ''}`}>
      <Image src={`${SS}/${name}.png`} alt={caption || name} width={800} height={1600}
        style={{ width: '100%', height: 'auto' }} />
      {caption && <div className={s.imgCaption}>{caption}</div>}
    </div>
  );
}

function ImgPair({ a, b }: { a: { name: string; caption?: string }; b: { name: string; caption?: string } }) {
  return (
    <div className={s.imgPair}>
      <div className={s.imgPairItem}>
        <Image src={`${SS}/${a.name}.png`} alt={a.caption || a.name} width={400} height={800}
          style={{ width: '100%', height: 'auto' }} />
        {a.caption && <div className={s.imgCaption}>{a.caption}</div>}
      </div>
      <div className={s.imgPairItem}>
        <Image src={`${SS}/${b.name}.png`} alt={b.caption || b.name} width={400} height={800}
          style={{ width: '100%', height: 'auto' }} />
        {b.caption && <div className={s.imgCaption}>{b.caption}</div>}
      </div>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className={s.statLine}>
      <span className={s.statLineLabel}>{label}</span>
      <span className={s.statLineValue}>{value}</span>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export default function ProductPage() {
  useBodyScroll();
  const [activeId, setActiveId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const handleScroll = useCallback(() => {
    setShowTop(window.scrollY > 400);

    const ids = NAV.flatMap(n => [n.id, ...(n.sub?.map(s => s.id) || [])]);
    for (let i = ids.length - 1; i >= 0; i--) {
      const el = document.getElementById(ids[i]);
      if (el && el.getBoundingClientRect().top <= 80) {
        setActiveId(ids[i]);
        return;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const navClick = (id: string) => {
    setSidebarOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={s.wrapper}>
      <SiteNav />

      {/* Mobile hamburger */}
      <button className={s.mobileToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
        <i className={`fas fa-${sidebarOpen ? 'times' : 'bars'}`} />
      </button>

      {/* Overlay */}
      <div
        className={`${s.sidebarOverlay} ${sidebarOpen ? s.sidebarOverlayVisible : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <nav className={`${s.sidebar} ${sidebarOpen ? s.sidebarOpen : ''}`}>
        <div className={s.sidebarHeader}>
          <Link href="/" className={s.sidebarLogo}>
            <span>Chatr</span> Product
          </Link>
          <div className={s.sidebarSubtitle}>Overview &bull; Architecture &bull; Commercial Case</div>
        </div>
        <div className={s.navSection}>
          {NAV.map(item => (
            <div key={item.id}>
              <a
                className={`${s.navLink} ${activeId === item.id ? s.navLinkActive : ''}`}
                onClick={() => navClick(item.id)}
              >
                {item.label}
              </a>
              {item.sub?.map(sub => (
                <a
                  key={sub.id}
                  className={`${s.navLink} ${s.navSub} ${activeId === sub.id ? s.navLinkActive : ''}`}
                  onClick={() => navClick(sub.id)}
                >
                  {sub.label}
                </a>
              ))}
            </div>
          ))}
        </div>
      </nav>

      {/* Theme toggle */}
      <div className={s.themeToggle}><ThemeToggle /></div>

      {/* Back to top */}
      <button
        className={`${s.backToTop} ${showTop ? s.backToTopVisible : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <i className="fas fa-chevron-up" />
      </button>

      {/* Main content */}
      <main className={s.main}>
        {/* Hero */}
        <div className={s.hero}>
          <h1 className={s.heroTitle}>
            <span className={s.heroAccent}>Chatr</span>
          </h1>
          <p className={s.heroSubtitle}>
            A complete, production-deployed real-time messaging platform built, tested, and deployed by a single developer.
          </p>
          <p className={s.heroTagline}>Product Overview &bull; Technical Architecture &bull; Commercial Case</p>
          <div className={s.heroImage}>
            <Image src={`${SS}/01-landing-page.png`} alt="Chatr landing page" width={800} height={600}
              style={{ width: '100%', height: 'auto' }} priority />
          </div>
          <div className={s.ctaRow}>
            <Link href="/app" className={`${s.ctaLink} ${s.ctaPrimary}`}>
              <i className="fas fa-comments" /> Open App
            </Link>
            <Link href="/docs" className={`${s.ctaLink} ${s.ctaSecondary}`}>
              <i className="fas fa-book" /> Documentation
            </Link>
            <Link href="/dashboard" className={`${s.ctaLink} ${s.ctaSecondary}`}>
              <i className="fas fa-chart-line" /> Dashboard
            </Link>
          </div>
        </div>

        <div className={s.statsBar}>
          {[['50+', 'Features'], ['1,300+', 'Tests'], ['69,542', 'Lines of Code'], ['22', 'Days']].map(([v, l]) => (
            <div key={l} className={s.statCard}>
              <div className={s.statValue}>{v}</div>
              <div className={s.statLabel}>{l}</div>
            </div>
          ))}
        </div>

        {/* ─── 1. Executive Summary ─────────────────────────── */}
        <Sec id="executive-summary">
          <H1>1. Executive Summary</H1>
          <P bold>Chatr is a fully functional, production-deployed, real-time messaging platform that demonstrates the breadth of a funded engineering team — delivered by a single developer in 22 days. It is not a prototype or proof of concept. It is a working product with 50+ user-facing features, 1,300+ automated tests, and a deployment running on AWS infrastructure.</P>
          <P>For a commercial audience, Chatr shows what a complete product looks like when messaging, AI, and customer support converge into a single platform. Its embeddable chat widget allows any business to add real-time customer support to their website with a single line of code — competing directly with tools like Intercom (£39–£99/seat/month) at zero recurring cost.</P>
          <P>For a technical audience, Chatr demonstrates mastery across frontend development (React 19, Next.js 16), backend engineering (Node.js, Express, Socket.IO), database design (PostgreSQL, Prisma), caching infrastructure (Redis), AI integration (OpenAI GPT-4o-mini), cloud deployment (AWS), and automated testing (Jest, Playwright). Every layer is production-grade, documented, and covered by automated tests.</P>
          <Callout>This page serves as both a commercial presentation and a technical reference. Each section explains what a feature does, why it matters commercially, and how it is implemented technically.</Callout>
        </Sec>

        {/* ─── 2. Commercial Opportunity ────────────────────── */}
        <Sec id="commercial-opportunity">
          <H1>2. The Commercial Opportunity</H1>
          <H2>The Market Problem</H2>
          <P>Every business needs real-time communication. Internal teams need to collaborate instantly. Support teams need to respond to customers while they are still on the website. Users expect the experience they get from consumer apps — instant delivery, typing indicators, read receipts, voice notes, file sharing, and a mobile-first interface that works flawlessly on any device.</P>
          <P>Today, companies face a costly trade-off:</P>
          <Bullets items={[
            { prefix: 'Option A:', text: 'Buy a third-party SaaS solution (Intercom, Zendesk Chat, Drift) and pay £39–£99 per agent per month, with limited customisation, vendor lock-in, and no control over user data.' },
            { prefix: 'Option B:', text: 'Build from scratch, spending 3–6 months on WebSocket infrastructure, message queuing, presence tracking, and delivery guarantees before writing a single user-facing feature.' },
          ]} />
          <H2>The Chatr Answer</H2>
          <P bold>Chatr eliminates that trade-off. It is a fully functional messaging platform that delivers enterprise-grade features at zero licensing cost. It is open, extensible, and built on industry-standard technology (React, Node.js, PostgreSQL, Redis) that any JavaScript developer can understand, modify, and extend on day one.</P>
          <P>Its embeddable chat widget turns any website into a live support channel — creating a direct, zero-friction communication bridge between businesses and their customers. That is where the commercial value lives.</P>
          <P>Live chat is one of the fastest-growing segments in customer support. Businesses using real-time chat see 48% higher revenue per chat hour compared to email support, and customers report 73% satisfaction rates with live chat — the highest of any support channel.</P>
          <P>The market for live chat software is dominated by expensive SaaS products:</P>
          <Bullets items={[
            { text: 'Intercom: £39–£99/seat/month, with feature gating and usage limits.' },
            { text: 'Drift: £50–£150/seat/month, focused on sales automation.' },
            { text: 'Zendesk Chat: £19–£99/seat/month, bundled with ticketing overhead.' },
            { prefix: '→', text: 'Chatr Widget: £0/seat, full ownership, no recurring cost, no vendor lock-in.' },
          ]} />
          <P bold>For a company with a 10-person support team, that is £4,700–£11,900/year in savings compared to Intercom alone. Beyond cost savings, Chatr gives businesses complete control over their data, full white-label customisation, and the ability to extend functionality without waiting for a vendor's roadmap.</P>
        </Sec>

        {/* ─── 3. Product Walkthrough ──────────────────────── */}
        <Sec id="product-walkthrough">
          <H1>3. Product Walkthrough</H1>
          <P>The screenshot below shows the main conversation screen. This single view demonstrates over a dozen capabilities working together in real time: groups, direct messages, AI conversations, guest visitors from the widget, typing indicators, unread badges, online presence, friend badges, and AI-generated conversation summaries.</P>
          <Img name="03-conversations" caption="Main conversation list — groups, DMs, AI bot, widget guests, typing indicators, presence, unread badges, and smart summaries" />
          <P>Every row in the conversation list is information-dense by design. At a glance, users can see:</P>
          <Bullets items={[
            { prefix: 'Presence —', text: 'Whether the contact is online (green dot), away (amber dot), or offline (grey dot) via real-time presence tracking.' },
            { prefix: 'Typing indicators —', text: 'If someone is currently typing, the last-message preview is replaced with an animated "typing…" indicator, visible without opening the conversation.' },
            { prefix: 'Unread badges —', text: 'Per-conversation unread message counts displayed as badges on each row, plus an aggregate badge on the bottom navigation tab.' },
            { prefix: 'Conversation badges —', text: '"Friend", "Group", "AI", and "Guest" badges distinguish conversation types at a glance.' },
            { prefix: 'Smart summaries —', text: 'AI summaries replace the last-message preview with a concise description of what was discussed, animated with a flip transition.' },
            { prefix: 'Message requests —', text: 'Messages from unknown contacts are separated into a "Requests" tab.' },
          ]} />
          <P>The search bar at the top filters conversations in real time. The bottom navigation provides instant access to Chats, Friends, Groups, and your Profile.</P>
        </Sec>

        <Sec id="registration-login">
          <H2>3.1 Registration & Login</H2>
          <P>New users register with a username, email address, and password. During registration, a real-time password strength indicator shows the strength of the chosen password as the user types: Weak (red), Fair (amber), Good (green), Strong (bright green).</P>
          <ImgPair
            a={{ name: '30-register-form', caption: 'Registration with password strength' }}
            b={{ name: '02-login', caption: 'Login screen' }}
          />
          <P>After submitting the registration form, a 6-digit one-time code is sent to the user's email address to verify their identity. Authentication supports four methods: email/password, SMS verification, email-based login codes, and optional TOTP two-factor authentication.</P>
          <Tech>JWT access tokens (localStorage) with long-lived HttpOnly refresh cookies. Expired/revoked tokens blacklisted in Redis. Rate-limited login attempts prevent brute-force attacks.</Tech>
        </Sec>

        {/* ─── 4. Messaging ────────────────────────────────── */}
        <Sec id="messaging">
          <H1>4. Messaging</H1>
          <P>Chatr delivers a messaging experience that matches or exceeds what users expect from WhatsApp, iMessage, and Slack. Every message type, interaction pattern, and real-time indicator found in those apps has been implemented, tested, and refined.</P>
          <ImgPair
            a={{ name: '04-chat-view', caption: 'Code blocks, reactions, replies, edits, receipts' }}
            b={{ name: '04b-chat-view-top', caption: 'Voice waveforms, shared media, link previews' }}
          />
        </Sec>

        <Sec id="message-types">
          <H2>4.1 Message Types</H2>
          <P>Chatr supports seven distinct message types. Each type has its own rendering, interaction model, and metadata.</P>

          <H3>Text Messages</H3>
          <P>Delivery status tracking through three states: "sending" (clock icon), "delivered" (single tick), and "read" (double tick, blue). Messages are grouped by date with separator headers and consecutive messages from the same sender are visually grouped.</P>
          <Tech>Transmitted via WebSocket (Socket.IO) for instant delivery. When the recipient is online, the message arrives in under 100ms. Offline messages stored in PostgreSQL and delivered on reconnection.</Tech>

          <H3>Voice Messages</H3>
          <P>Users record voice notes directly from the chat input bar. Voice messages display an interactive waveform visualisation, duration counter, and playback controls. The sender receives a "listened" receipt when the recipient plays the message.</P>
          <Tech>Recorded using the Web Audio API and MediaRecorder, encoded as WebM/Opus, uploaded to AWS S3. Waveform pre-computed during recording. Cached locally in IndexedDB for offline replay.</Tech>

          <H3>Image Sharing</H3>
          <P>Images appear as inline previews. Tapping opens a fullscreen lightbox with pinch-to-zoom on mobile. Server-side Sharp processing generates thumbnail, medium, and full-resolution variants.</P>
          <Img name="32-image-lightbox" caption="Fullscreen image lightbox" />

          <H3>Video Sharing</H3>
          <P>Videos display as inline players with thumbnail, duration, and standard playback controls.</P>

          <H3>File Attachments</H3>
          <P>Supports uploads up to 50 MB — PDFs, Word, Excel, ZIP, and more. Type-specific icons, file name, size, and download link.</P>

          <H3>Link Previews</H3>
          <P>URLs are automatically fetched server-side for Open Graph metadata (title, description, image, favicon) and rendered as rich preview cards — the same way link previews function in Slack and iMessage.</P>

          <H3>Code Blocks</H3>
          <P>Triple-backtick fenced code is rendered with syntax highlighting, automatic language detection, and a "Copy" button. 40+ languages supported.</P>
          <Img name="41-code-block" caption="Syntax-highlighted TypeScript code block with Copy button" />
        </Sec>

        <Sec id="message-actions">
          <H2>4.2 Message Actions</H2>
          <P>Every message is interactive. Users can react, reply, edit, and unsend.</P>

          <H3>Emoji Reactions</H3>
          <P>Tap-and-hold to add emoji badges below any message. Multiple reactions per message from different users. Hovering reveals who reacted.</P>

          <H3>Reply to Message</H3>
          <P>Swipe right (mobile) or context menu to reply. Quoted preview shows original sender, content type, and truncated text. Tap to scroll back to the original.</P>
          <ImgPair
            a={{ name: '42-reactions', caption: 'Reaction badges with emoji counts' }}
            b={{ name: '43-reply-thread', caption: 'Reply with quoted original message' }}
          />

          <H3>Edit Sent Messages</H3>
          <P>Edit any sent message. Up-arrow shortcut on desktop (like Slack). "(edited)" label shown. Full edit history stored for audit.</P>
          <Tech>Edits are versioned: the backend stores complete edit history. Broadcast via Socket.IO in real time.</Tech>

          <H3>Unsend Messages</H3>
          <P>Delete for everyone — message replaced with a "deleted" placeholder, equivalent to WhatsApp's "Delete for Everyone".</P>

          <H3>Emoji Picker</H3>
          <P>Full emoji picker with category tabs, search, and recently-used section.</P>
          <Img name="22-emoji-picker" caption="Full emoji picker with categories, search, and recently-used" />
        </Sec>

        <Sec id="realtime-awareness">
          <H2>4.3 Real-Time Awareness</H2>
          <P>One of Chatr's most distinctive qualities is the density of its real-time feedback. Users always know who is online, who is typing, who has read their message, and even what the other person is writing character by character.</P>

          <H3>Typing Indicators in Chat</H3>
          <P>Animated "typing…" indicator with bouncing dots appears at the bottom of the conversation within 200ms of the first keystroke. In group chats, it shows who is typing.</P>

          <H3>Typing Indicators on the Chat List</H3>
          <P>A feature most messaging apps lack. The last-message preview on the conversation list is replaced with "typing…" — users can see who is composing without opening the conversation.</P>
          <ImgPair
            a={{ name: '26-typing-in-chat', caption: 'Typing indicator in chat (animated dots)' }}
            b={{ name: '25-typing-chat-list', caption: '"typing…" replacing last-message on list' }}
          />
          <Tech>Typing events emitted via Socket.IO with debouncing. 3-second timeout managed client-side.</Tech>

          <H3>Ghost Typing</H3>
          <P>An optional mode that streams every character the other person types in real time, letter by letter. No mainstream messaging app offers this.</P>

          <H3>Audio Recording Indicator</H3>
          <P>When someone is recording a voice note, the other participant sees a "recording…" indicator in real time.</P>

          <H3>Online Presence</H3>
          <P>Green (online), amber (away, idle 5+ minutes), grey (offline) dots on every avatar. "Last seen X ago" for offline contacts.</P>
          <Tech>Presence tracked via Redis with TTLs. Changes broadcast to all contacts via Socket.IO.</Tech>

          <H3>Read Receipts</H3>
          <P>Three delivery states: sending (clock), delivered (tick), read (blue double tick). Voice messages add a "listened" state.</P>
        </Sec>

        <Sec id="offline-sync">
          <H2>4.4 Offline & Sync</H2>
          <P>Chatr works reliably even when the network is unavailable.</P>
          <Bullets items={[
            { prefix: 'IndexedDB Cache —', text: 'Conversations, contacts, and messages cached locally. App renders instantly from cache while syncing in the background.' },
            { prefix: 'Outbound Queue —', text: 'Messages sent offline are queued locally, displayed with a "sending" icon, and delivered automatically when the connection restores.' },
            { prefix: 'Audio Cache —', text: 'Voice messages cached after first playback for instant offline replay.' },
            { prefix: 'Storage Management —', text: 'Visual breakdown of storage by category with one-tap reset in Settings.' },
          ]} />
        </Sec>

        {/* ─── 5. Groups & Social ──────────────────────────── */}
        <Sec id="groups-social">
          <H1>5. Groups & Social</H1>
          <P>Full-featured group chats with role management, invite controls, and a social layer.</P>
          <ImgPair
            a={{ name: '06-groups', caption: 'Groups with member counts and search' }}
            b={{ name: '05-friends', caption: 'Friends with online presence' }}
          />

          <H2>Group Chat</H2>
          <P>Each group has a name, avatar, cover image, and description. All seven message types are supported, along with reactions, replies, and edits.</P>
          <ImgPair
            a={{ name: '23-group-chat', caption: 'Group conversation' }}
            b={{ name: '34-group-members', caption: 'Member list with role badges' }}
          />

          <H3>Role Management</H3>
          <Bullets items={[
            { prefix: 'Owner —', text: 'Full control: promote, demote, remove anyone, transfer ownership, delete group, edit details.' },
            { prefix: 'Admin —', text: 'Add and remove members (not other admins or owner). Edit group details.' },
            { prefix: 'Member —', text: 'Send messages, react, reply, and leave.' },
          ]} />

          <H3>Invitations</H3>
          <P>Owners and Admins invite new members via search. Pending invitations appear as a badge on the Groups tab.</P>

          <H2>Friends & Social Layer</H2>
          <H3>Friend Requests</H3>
          <P>Users send friend requests via search. Recipients can accept, decline, or block. Accepted contacts show a "Friend" badge on the conversation list.</P>

          <H3>Blocking</H3>
          <P>Comprehensive: blocked users cannot search for you, message you, view your profile, or see your online status. Managed from Settings.</P>

          <H3>User Search</H3>
          <P>Find any user by name or username. Start conversations, send friend requests, or view profiles from search results.</P>
        </Sec>

        {/* ─── 6. Widget ───────────────────────────────────── */}
        <Sec id="widget">
          <H1>6. The Embeddable Support Widget</H1>
          <Callout>The widget transforms Chatr from a messaging app into a revenue-generating customer support platform. This is where the commercial value proposition is strongest.</Callout>
        </Sec>

        <Sec id="widget-how">
          <H2>6.1 How It Works</H2>
          <P>Any website adds live support by pasting one line of JavaScript. A floating chat bubble appears. When a visitor clicks, a panel opens asking for their name and question — no sign-up, no email, zero friction.</P>
          <P>Messages arrive instantly in the agent's Chatr inbox, tagged with a "Guest" badge. The agent replies from Chatr; the visitor sees the response in real time. Sessions persist for 24 hours.</P>
          <ImgPair
            a={{ name: '11-widget-intro', caption: 'Widget greeting panel' }}
            b={{ name: '11b-widget-form-filled', caption: 'Visitor fills in name and question' }}
          />
          <ImgPair
            a={{ name: '11c-widget-chat', caption: 'Message arrives in agent\'s inbox' }}
            b={{ name: '11d-widget-conversation', caption: 'Live two-way conversation' }}
          />
          <P bold>Chatr delivers the same core functionality as Intercom — real-time messaging, file sharing, persistent sessions — with full code ownership and zero recurring fees.</P>
        </Sec>

        <Sec id="widget-customise">
          <H2>6.2 White-Label Customisation</H2>
          <P>The widget is fully white-labelled. A visual Palette Designer lets agents configure:</P>
          <Bullets items={[
            { text: 'Primary, background, text, and header colours via colour pickers.' },
            { text: 'Dark/light mode toggle.' },
            { text: 'Custom greeting text and placeholder messages.' },
            { text: 'Preset colour themes for quick configuration.' },
            { text: 'One-click "Copy Embed Code" button.' },
          ]} />
          <Img name="37-widget-palette-designer" caption="Widget Palette Designer — colours, themes, and embed code" wide />
        </Sec>

        <Sec id="widget-tech">
          <H2>6.3 Technical Implementation</H2>
          <P>The widget is a standalone JavaScript file (chatr.js) that injects its own DOM without interfering with the host page. It creates a guest session via Socket.IO with a 24-hour TTL in localStorage.</P>
          <P>It supports all DM features: text, voice notes, file attachments, link previews, typing indicators, and read receipts. It is the full Chatr messaging experience embedded in a third-party website.</P>
        </Sec>

        {/* ─── 7. AI ───────────────────────────────────────── */}
        <Sec id="ai">
          <H1>7. AI-Powered Intelligence</H1>
          <P>Chatr integrates AI at two levels: a conversational assistant and a background intelligence layer.</P>

          <H2>Luna — AI Chat Assistant</H2>
          <P>Luna is Chatr's built-in AI chatbot, powered by OpenAI's GPT-4o-mini. She appears as a regular contact in the conversation list. Users interact with Luna exactly as they would with a human — same UI, same features, zero learning curve.</P>
          <P>Luna "types" while generating a response (typing indicator), supports full conversation history, and provides contextual, helpful answers.</P>
          <Img name="20-luna-chat" caption="Luna AI assistant providing detailed, contextual responses" />
          <Tech>Conversation history sent to OpenAI API with a personality system prompt. Responses stream token by token. Rate-limited with error recovery.</Tech>

          <H2>Automatic Conversation Summaries</H2>
          <P>AI-generated one-line summaries appear on the conversation list, replacing the last-message preview. Managers can scan every conversation's status without opening a single thread.</P>

          <H2>Toast Notifications</H2>
          <P>Incoming messages trigger non-intrusive toast notifications with the sender's avatar, name, and message preview. Tapping opens the conversation. Auto-dismiss after 5 seconds.</P>
        </Sec>

        {/* ─── 8. Security ─────────────────────────────────── */}
        <Sec id="security">
          <H1>8. Security, Authentication & Privacy</H1>
          <P>Enterprise-grade identity verification and granular privacy controls.</P>
        </Sec>

        <Sec id="auth-methods">
          <H2>8.1 Authentication Methods</H2>
          <H3>Registration</H3>
          <P>Username, email, password with real-time strength indicator. 6-digit email verification code activates the account.</P>
          <H3>Login</H3>
          <P>Credentials plus email or SMS verification code. Two-step login prevents compromised-password attacks.</P>
          <Tech>JWT with short-lived access + long-lived HttpOnly refresh tokens. Redis-backed token blacklisting.</Tech>
          <H3>Two-Factor Authentication (2FA)</H3>
          <P>Optional TOTP via any authenticator app. QR code setup. Backup codes provided. Implemented using RFC 6238.</P>
          <H3>SMS Verification</H3>
          <P>Phone number verification via one-time SMS code. Can be used as a secondary login channel.</P>
          <H3>Password Recovery</H3>
          <P>Secure email-based reset link with configurable expiry. Single-use.</P>
        </Sec>

        <Sec id="privacy-controls">
          <H2>8.2 Privacy Controls</H2>
          <P>Users control who can see each piece of their profile — online status, name, phone, email, gender, join date — with three visibility levels: Everyone, Friends only, or Nobody.</P>
          <Img name="24-privacy-settings" caption="Privacy settings — per-field visibility controls" />
          <Tech>Enforced server-side: the API strips restricted fields before responding. Cannot be bypassed via network inspection.</Tech>
        </Sec>

        <Sec id="rate-limiting">
          <H2>8.3 Rate Limiting & Protection</H2>
          <P>All sensitive endpoints are rate-limited using Redis-backed sliding window counters. Failed login attempts trigger temporary lockout. Message sending is throttled per-client. Protects against brute-force, credential stuffing, and denial-of-service.</P>
        </Sec>

        {/* ─── 9. Design & Themes ──────────────────────────── */}
        <Sec id="design-themes">
          <H1>9. Mobile-First Design & Themes</H1>
          <P>Every screenshot in this document was captured at mobile viewport resolution (390×844, iPhone 14). Chatr is designed mobile-first and scales up to desktop with a persistent sidebar layout. Bottom tab navigation, touch-optimised targets, swipe gestures, and iOS safe-area insets.</P>

          <H2>Dark & Light Themes</H2>
          <P>Switch with a single tap — no reload, no flicker. Dark theme uses deep navy optimised for OLED screens.</P>
          <ImgPair
            a={{ name: '18-dark-theme', caption: 'Dark theme — conversation list' }}
            b={{ name: '27-dark-theme-chat', caption: 'Dark theme — chat view' }}
          />
          <ImgPair
            a={{ name: '19-light-theme', caption: 'Light theme — conversation list' }}
            b={{ name: '36-light-theme-chat', caption: 'Light theme — chat view' }}
          />
          <Tech>CSS custom properties toggled at the document root. Theme stored in localStorage, applied before first paint via blocking script.</Tech>
        </Sec>

        {/* ─── 10. Profile ─────────────────────────────────── */}
        <Sec id="profile">
          <H1>10. Profile & Personalisation</H1>
          <H2>Profile</H2>
          <P>Circular avatar, 16:9 cover banner with built-in crop tools. Display name, bio, username, and personal details.</P>
          <H2>Settings</H2>
          <Bullets items={[
            { text: 'Theme toggle (dark/light) with instant preview.' },
            { text: 'Ghost typing toggle.' },
            { text: 'Privacy settings (per-field visibility controls).' },
            { text: 'Blocked users management.' },
            { text: 'Storage usage chart with per-category breakdown.' },
            { text: 'Account settings, 2FA setup, logout.' },
          ]} />
          <ImgPair
            a={{ name: '08-profile', caption: 'User profile with avatar and cover' }}
            b={{ name: '07-settings', caption: 'Settings panel' }}
          />
          <Img name="35-settings-storage" caption="Storage usage breakdown" />
        </Sec>

        {/* ─── 11. Architecture ────────────────────────────── */}
        <Sec id="architecture">
          <H1>11. Technical Architecture</H1>
          <P>For technical evaluators. The stack follows industry best practices, designed for production reliability and horizontal scalability.</P>
        </Sec>

        <Sec id="the-stack">
          <H2>11.1 The Stack</H2>
          <P bold>Frontend — Next.js 16, React 19, TypeScript.</P>
          <P>App Router, strict TypeScript, React Context (no Redux), Framer Motion animations, Socket.IO for real-time, IndexedDB for offline cache.</P>
          <P bold>Backend — Node.js, Express, TypeScript.</P>
          <P>70+ REST endpoints, 40+ Socket.IO event types. Authentication, message routing, file uploads, AI integration, email/SMS delivery.</P>
          <P bold>Database — PostgreSQL 16, Prisma ORM.</P>
          <P>9 models with type-safe queries and automatic migrations.</P>
          <P bold>Caching & Pub/Sub — Redis 7.</P>
          <P>Presence tracking, rate limiting, token blacklisting, and cross-instance pub/sub via Socket.IO Redis adapter.</P>
          <P bold>AI — OpenAI GPT-4o-mini.</P>
          <P>Chatbot (Luna) and automatic conversation summaries.</P>
          <P bold>Storage — AWS S3.</P>
          <P>Media storage. Sharp generates multi-resolution image variants on upload.</P>
        </Sec>

        <Sec id="realtime-infra">
          <H2>11.2 Real-Time Infrastructure</H2>
          <H3>Message Delivery Pipeline</H3>
          <Bullets items={[
            { text: 'Frontend emits "message:send" via Socket.IO with content, type, and recipient ID.' },
            { text: 'Backend validates, persists to PostgreSQL, emits "message:new" to recipient\'s room.' },
            { text: '"message:delivered" acknowledgement updates sender\'s UI. "message:read" completes the cycle when the message scrolls into view.' },
            { text: 'Offline messages stored in PostgreSQL, delivered on reconnection.' },
          ]} />
          <P>End-to-end delivery completes in under 100ms.</P>
          <H3>Horizontal Scaling</H3>
          <P>Socket.IO Redis adapter enables multiple backend instances behind a load balancer. Redis pub/sub routes messages across instances transparently. Scaling means adding servers, not rewriting code.</P>
        </Sec>

        <Sec id="database-design">
          <H2>11.3 Database Design</H2>
          <Bullets items={[
            { prefix: 'User —', text: 'Credentials, profile, settings, presence, guest sessions.' },
            { prefix: 'Conversation —', text: 'DM thread between two users. Last message timestamp for sorting.' },
            { prefix: 'Message —', text: 'Content, type, sender, recipient/group, status, reply reference, timestamps. Indexed for fast queries.' },
            { prefix: 'Group —', text: 'Name, description, avatar, cover, metadata.' },
            { prefix: 'GroupMember —', text: 'Users ↔ groups with role (Owner, Admin, Member) and invite status.' },
            { prefix: 'Friendship —', text: 'Friend connection with status (pending, accepted, blocked).' },
            { prefix: 'Reaction —', text: 'Emoji ↔ message ↔ user with unique constraint.' },
            { prefix: 'MessageEditHistory —', text: 'Full edit history (original content, updated content, timestamp).' },
            { prefix: 'Session —', text: 'Active sessions for token management and multi-device support.' },
          ]} />
        </Sec>

        <Sec id="media-pipeline">
          <H2>11.4 Media Pipeline</H2>
          <Bullets items={[
            { text: 'Frontend sends file via multipart POST.' },
            { text: 'Backend validates type and size (max 50 MB).' },
            { text: 'Images: Sharp generates 200px thumbnail, 600px medium, and original. All uploaded to S3.' },
            { text: 'Non-images: uploaded to S3 as-is.' },
            { text: 'S3 URLs stored in message record and delivered to recipient.' },
          ]} />
        </Sec>

        <Sec id="deployment">
          <H2>11.5 Deployment & Scaling</H2>
          <Bullets items={[
            { prefix: 'EC2 —', text: 'Node.js backend in PM2 cluster mode across all CPU cores.' },
            { prefix: 'RDS —', text: 'Managed PostgreSQL with automatic backups and encryption at rest.' },
            { prefix: 'ElastiCache —', text: 'Managed Redis for presence, rate limiting, pub/sub, token blacklisting.' },
            { prefix: 'S3 —', text: 'Media storage with server-side encryption and lifecycle policies.' },
            { prefix: 'Nginx —', text: 'Reverse proxy, TLS termination, WebSocket upgrade handling.' },
          ]} />
          <P>Runs locally via Docker Compose in a single command. Development and production environments are architecturally identical.</P>
        </Sec>

        {/* ─── 12. Quality Assurance ───────────────────────── */}
        <Sec id="quality">
          <H1>12. Quality Assurance</H1>
          <P>Over 1,300 automated tests across three tiers.</P>
          <div className={s.statsBar}>
            {[['1,300+', 'Total Tests'], ['855', 'Frontend'], ['305', 'Backend'], ['156', 'End-to-End']].map(([v, l]) => (
              <div key={l} className={s.statCard}>
                <div className={s.statValue}>{v}</div>
                <div className={s.statLabel}>{l}</div>
              </div>
            ))}
          </div>

          <H2>Frontend (855 tests)</H2>
          <P>Every React component, hook, context, form, and page tested. 99% coverage. Runs in under 30 seconds.</P>

          <H2>Backend (305 tests)</H2>
          <P>Every API endpoint, auth flow, Socket.IO handler, email/SMS service, and AI integration tested. 73% coverage.</P>

          <H2>End-to-End (156 tests)</H2>
          <P>Playwright drives Desktop Chrome and iPhone 14. Two simultaneous test users verify real-time delivery, typing indicators, and presence.</P>
          <Tech>E2E results cached to .test-cache/ and displayed in the developer dashboard. Custom Playwright reporter.</Tech>
        </Sec>

        {/* ─── 13. Dashboard ───────────────────────────────── */}
        <Sec id="dashboard">
          <H1>13. Analytics Dashboard</H1>
          <P>Custom-built project intelligence dashboard with real-time code health, development velocity, test results, and security posture. Auto-refreshes every 30 seconds.</P>
          <Img name="10-dashboard-top" caption="Dashboard — metric cards, code health gauges, commit intelligence" wide />
          <Bullets items={[
            { text: '17+ live metrics: commits, LOC, source files, tests, API endpoints, components, models.' },
            { text: 'Circular code health gauges with green/amber/red thresholds.' },
            { text: 'Commit intelligence: change type distribution, size distribution, weekly trends, heatmap.' },
            { text: 'Security audit: npm vulnerability scan, build health for frontend and backend.' },
            { text: 'Embedded test runner with real-time streaming results and re-run controls.' },
          ]} />
          <Img name="09-dashboard-full" caption="Full analytics dashboard (scrolled)" wide />
        </Sec>

        {/* ─── 14. Developer Experience ────────────────────── */}
        <Sec id="devex">
          <H1>14. Developer Experience</H1>
          <P>Tooling built alongside the application with the same attention to quality.</P>
          <ImgPair
            a={{ name: '12-docs', caption: 'Built-in documentation' }}
            b={{ name: '13-email-templates', caption: 'Email template previews' }}
          />
          <Bullets items={[
            { prefix: 'Docs —', text: 'Searchable documentation with architecture diagrams, API reference, and setup guides.' },
            { prefix: 'Email Templates —', text: 'Visual previews of every transactional email.' },
            { prefix: 'API Docs —', text: 'Interactive Swagger UI for all 70+ REST endpoints.' },
            { prefix: 'Component Demos —', text: 'Living style guide for every UI component.' },
            { prefix: 'Log Viewer —', text: 'In-app logs with filtering, search, and severity levels.' },
            { prefix: 'Docker Compose —', text: 'git clone to running app in under 2 minutes.' },
          ]} />
        </Sec>

        {/* ─── 15. By the Numbers ──────────────────────────── */}
        <Sec id="numbers">
          <H1>15. By the Numbers</H1>
          <div className={s.statLines}>
            {[
              ['User-facing features', '50+'],
              ['Automated tests', '1,300+'],
              ['Lines of code', '69,542'],
              ['Source files', '369'],
              ['REST API endpoints', '70+'],
              ['WebSocket event types', '40+'],
              ['UI components', '176 (60+ custom)'],
              ['Database models', '9'],
              ['Auth methods', '4'],
              ['Message types', '7'],
              ['File upload limit', '50 MB'],
              ['Frontend coverage', '99%'],
              ['Backend coverage', '73%'],
              ['E2E browsers', 'Chrome + iPhone 14'],
              ['Deployment', 'AWS'],
              ['Offline support', 'IndexedDB + queue'],
              ['Development time', '22 days'],
              ['Total commits', '219'],
            ].map(([l, v]) => <StatLine key={l} label={l} value={v} />)}
          </div>
        </Sec>

        {/* ─── 16. Why Invest ──────────────────────────────── */}
        <Sec id="invest">
          <H1>16. Why Invest in Chatr</H1>

          <H2>It Is a Complete Product</H2>
          <P>Not a mockup, tutorial, or proof of concept. 50+ features — real-time messaging, voice notes, video, file sharing, code blocks, link previews, typing indicators, ghost typing, read receipts, reactions, replies, editing, unsending, group chats with roles, friend requests, blocking, search, AI chatbot, conversation summaries, toast notifications, offline support, dark/light themes, profile system, privacy controls, 2FA, SMS verification, email verification, and a fully embeddable support widget. Every feature is built, integrated, and tested.</P>

          <H2>It Generates Revenue</H2>
          <P>The widget competes directly with Intercom (£39–£99/seat/month), Drift, and Zendesk Chat — at zero recurring cost. A 10-person team saves £4,700–£11,900/year.</P>

          <H2>It Is Tested Like Enterprise Software</H2>
          <P>1,300+ tests across three tiers. 99% frontend and 73% backend coverage. Custom dashboard visualises test results, code health, and security in real time.</P>

          <H2>It Is Built on Proven Technology</H2>
          <P>React 19, Next.js 16, Node.js, PostgreSQL, Redis, AWS — the same stack trusted by Slack, Shopify, Netflix, and Uber. Any JavaScript developer can be productive on day one.</P>

          <H2>It Scales Without Rewriting</H2>
          <P>PM2 cluster mode, Socket.IO Redis adapter, managed PostgreSQL, S3. Scaling means adding servers, not rewriting architecture.</P>

          <H2>It Demonstrates Exceptional Engineering Range</H2>
          <P bold>Frontend. Backend. Real-time WebSocket infrastructure. AI integration. Cloud deployment. Database design. Security. Accessibility. Three-tier testing. Developer tooling. Analytics dashboard. Email/SMS services. Embeddable widget. All designed, built, tested, documented, and deployed by a single developer in 22 days.</P>
        </Sec>
      </main>
    </div>
  );
}
