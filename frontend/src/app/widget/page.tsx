'use client';

import Image from 'next/image';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { useBodyScroll } from '@/components/site/useBodyScroll';
import s from '@/components/site/Site.module.css';

const SS = '/screenshots';

export default function WidgetPage() {
  useBodyScroll();
  return (
    <div className={s.page}>
      <SiteNav />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className={s.heroSection}>
        <div className={s.heroGradient} />
        <div className={s.heroInner}>
          <span className={s.heroTag}>Embeddable Widget</span>
          <h1 className={s.heroH1}>
            Add live support to any website.{' '}
            <span className={s.accent}>One line of code.</span>
          </h1>
          <p className={s.heroP}>
            A floating chat widget that turns any website into a live support channel —
            replacing Intercom, Drift, and Zendesk at zero recurring cost. No sign-up
            required for visitors. Full ownership of your data.
          </p>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <p className={s.sectionTag}>Setup</p>
          <h2 className={s.sectionH2}>How It Works</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Four steps from embed to live conversation. Zero friction for visitors, zero
            configuration for agents.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.5rem',
            marginTop: '2.5rem',
          }}
        >
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconBlue}`}>
              <i className="fas fa-code" />
            </div>
            <div className={s.cardTitle}>1. Paste Embed Code</div>
            <div className={s.cardText}>
              One &lt;script&gt; tag. Drop it into any HTML page — WordPress, Shopify,
              React, plain HTML. A floating chat bubble appears.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconPurple}`}>
              <i className="fas fa-comment-dots" />
            </div>
            <div className={s.cardTitle}>2. Visitor Asks a Question</div>
            <div className={s.cardText}>
              The visitor enters their name and types a question. No email, no sign-up,
              zero friction.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconGreen}`}>
              <i className="fas fa-inbox" />
            </div>
            <div className={s.cardTitle}>3. Agent Gets It in Chatr</div>
            <div className={s.cardText}>
              The message arrives instantly in the agent&rsquo;s Chatr inbox, tagged with a
              &ldquo;Guest&rdquo; badge. No separate dashboard needed.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconOrange}`}>
              <i className="fas fa-comments" />
            </div>
            <div className={s.cardTitle}>4. Real-Time Conversation</div>
            <div className={s.cardText}>
              The agent replies from Chatr; the visitor sees the response in real time.
              Full two-way messaging with typing indicators.
            </div>
          </div>
        </div>

        <div className={s.screenshotRow}>
          <Image src={`${SS}/11-widget-intro.png`} alt="Widget intro" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/11b-widget-form-filled.png`} alt="Widget form" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/11c-widget-chat.png`} alt="Widget in agent inbox" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/11d-widget-conversation.png`} alt="Widget conversation" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
        </div>
      </div>

      {/* ── White-Label Customisation ─────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <p className={s.sectionTag}>Branding</p>
            <h2 className={s.sectionH2}>White-Label Customisation</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              A visual Palette Designer lets you configure primary, background, text, and header
              colours. Dark/light mode toggle, preset colour themes, custom greeting text, and
              a one-click &ldquo;Copy Embed Code&rdquo; button. Your brand, your widget.
            </p>
          </div>

          <div className={s.screenshotRow}>
            <Image src={`${SS}/37-widget-palette-designer.png`} alt="Widget Palette Designer" width={800} height={500}
              className={s.screenshotWide} style={{ width: '100%', maxWidth: 800, height: 'auto' }} />
          </div>
          <p className={s.screenshotCaption}>Widget Palette Designer — colours, themes, and embed code</p>
        </div>
      </div>

      {/* ── Replace Expensive SaaS ────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <p className={s.sectionTag}>Pricing</p>
          <h2 className={s.sectionH2}>Replace Expensive SaaS</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Live chat tools charge per seat, per month, with feature gating and usage limits.
            Chatr delivers the same core functionality with full ownership and zero recurring fees.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1.5rem',
          marginTop: '2.5rem',
        }}>
          <div className={s.pricingCard}>
            <div className={s.pricingName}>Intercom</div>
            <div className={s.pricingPrice}>£39–99</div>
            <div className={s.pricingPeriod}>per seat / month</div>
            <div className={s.pricingDesc}>Feature gating, usage caps, vendor lock-in.</div>
            <ul className={s.pricingFeatures}>
              <li><i className="fas fa-check" /> Live chat</li>
              <li><i className="fas fa-check" /> Inbox</li>
              <li><i className="fas fa-times" style={{ color: 'var(--color-red-500)' }} /> Full data ownership</li>
            </ul>
          </div>

          <div className={s.pricingCard}>
            <div className={s.pricingName}>Drift</div>
            <div className={s.pricingPrice}>£50–150</div>
            <div className={s.pricingPeriod}>per seat / month</div>
            <div className={s.pricingDesc}>Sales-focused automation with high price tag.</div>
            <ul className={s.pricingFeatures}>
              <li><i className="fas fa-check" /> Live chat</li>
              <li><i className="fas fa-check" /> Playbooks</li>
              <li><i className="fas fa-times" style={{ color: 'var(--color-red-500)' }} /> Full data ownership</li>
            </ul>
          </div>

          <div className={s.pricingCard}>
            <div className={s.pricingName}>Zendesk Chat</div>
            <div className={s.pricingPrice}>£19–99</div>
            <div className={s.pricingPeriod}>per seat / month</div>
            <div className={s.pricingDesc}>Bundled with ticketing overhead and complexity.</div>
            <ul className={s.pricingFeatures}>
              <li><i className="fas fa-check" /> Live chat</li>
              <li><i className="fas fa-check" /> Triggers</li>
              <li><i className="fas fa-times" style={{ color: 'var(--color-red-500)' }} /> Full data ownership</li>
            </ul>
          </div>

          <div className={`${s.pricingCard} ${s.pricingFeatured}`}>
            <div className={s.pricingBadge}>Your Platform</div>
            <div className={s.pricingName}>Chatr Widget</div>
            <div className={s.pricingPrice}>£0</div>
            <div className={s.pricingPeriod}>forever — you own the code</div>
            <div className={s.pricingDesc}>Full feature set, zero recurring cost, complete ownership.</div>
            <ul className={s.pricingFeatures}>
              <li><i className="fas fa-check" /> Live chat</li>
              <li><i className="fas fa-check" /> Voice, files, links</li>
              <li><i className="fas fa-check" /> White-label branding</li>
              <li><i className="fas fa-check" /> Full data ownership</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Full Feature Support ──────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <p className={s.sectionTag}>Capabilities</p>
            <h2 className={s.sectionH2}>Full Feature Support</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              The widget isn&rsquo;t a stripped-down chat box. It supports the full Chatr
              messaging experience, embedded on a third-party website.
            </p>
          </div>

          <div className={s.grid3}>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconBlue}`}>
                <i className="fas fa-comment" />
              </div>
              <div className={s.cardTitle}>Text Messages</div>
              <div className={s.cardText}>
                Real-time delivery with typing indicators and read receipts.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconPurple}`}>
                <i className="fas fa-microphone" />
              </div>
              <div className={s.cardTitle}>Voice Notes</div>
              <div className={s.cardText}>
                Record and send voice messages with waveform playback.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconGreen}`}>
                <i className="fas fa-file-upload" />
              </div>
              <div className={s.cardTitle}>File Sharing</div>
              <div className={s.cardText}>
                Upload images, documents, and files up to 50 MB.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconOrange}`}>
                <i className="fas fa-ellipsis-h" />
              </div>
              <div className={s.cardTitle}>Typing Indicators</div>
              <div className={s.cardText}>
                Both visitor and agent see animated typing indicators.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconRed}`}>
                <i className="fas fa-check-double" />
              </div>
              <div className={s.cardTitle}>Read Receipts</div>
              <div className={s.cardText}>
                Sent, delivered, and read — full delivery tracking.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconSlate}`}>
                <i className="fas fa-link" />
              </div>
              <div className={s.cardTitle}>Link Previews</div>
              <div className={s.cardText}>
                URLs rendered as rich preview cards with metadata.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Technical Details ─────────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <p className={s.sectionTag}>Under the Hood</p>
          <h2 className={s.sectionH2}>Technical Details</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Lightweight, standalone, and designed to not interfere with your site.
          </p>
        </div>

        <div className={s.techGrid}>
          <div className={s.techCard}>
            <div className={s.techLabel}>Runtime</div>
            <div className={s.techName}>Standalone JS</div>
            <div className={s.techDesc}>
              Single JavaScript file (chatr.js) that injects its own DOM. No dependencies,
              no framework required.
            </div>
          </div>
          <div className={s.techCard}>
            <div className={s.techLabel}>Transport</div>
            <div className={s.techName}>Socket.IO</div>
            <div className={s.techDesc}>
              Real-time WebSocket connection with automatic fallback to long-polling.
              Sub-100ms message delivery.
            </div>
          </div>
          <div className={s.techCard}>
            <div className={s.techLabel}>Sessions</div>
            <div className={s.techName}>localStorage</div>
            <div className={s.techDesc}>
              Guest sessions stored in localStorage with a 24-hour TTL. Visitors can close
              the tab and return to their conversation.
            </div>
          </div>
          <div className={s.techCard}>
            <div className={s.techLabel}>Lifecycle</div>
            <div className={s.techName}>24h TTL</div>
            <div className={s.techDesc}>
              Guest sessions expire after 24 hours. No stale data, no database bloat,
              automatic cleanup.
            </div>
          </div>
          <div className={s.techCard}>
            <div className={s.techLabel}>Auth</div>
            <div className={s.techName}>No Auth Required</div>
            <div className={s.techDesc}>
              Visitors don&rsquo;t need accounts. Name and message — that&rsquo;s it.
              Zero friction to start a conversation.
            </div>
          </div>
          <div className={s.techCard}>
            <div className={s.techLabel}>Isolation</div>
            <div className={s.techName}>Shadow DOM Safe</div>
            <div className={s.techDesc}>
              Widget styles are scoped. No CSS leaks, no conflicts with the host page&rsquo;s
              stylesheets.
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <h2 className={s.sectionH2}>See it in action</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              Try the live widget demo with the colour palette designer, or explore the full
              product overview for architecture details, screenshots, and commercial analysis.
            </p>
            <div className={s.heroCtas}>
              <Link href="/widget-demo" className={s.btnPrimary}>
                <i className="fas fa-play-circle" /> Live Widget Demo
              </Link>
              <Link href="/product" className={s.btnSecondary}>
                <i className="fas fa-book-open" /> Full Product Overview
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
