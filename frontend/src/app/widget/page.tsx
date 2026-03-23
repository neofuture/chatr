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
      <main id="main-content">

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className={s.heroSection}>
        <div className={s.heroGradient} aria-hidden="true" />
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
          <div className={s.heroCtas}>
            <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
              <i className="fab fa-github" aria-hidden="true" /> View on GitHub
            </a>
            <Link href="/widget-demo" className={s.btnSecondary}>
              <i className="fas fa-play-circle" aria-hidden="true" /> Live Demo
            </Link>
          </div>
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
              <i className="fas fa-code" aria-hidden="true" />
            </div>
            <div className={s.cardTitle}>1. Paste Embed Code</div>
            <div className={s.cardText}>
              One &lt;script&gt; tag. Drop it into any HTML page — WordPress, Shopify,
              React, plain HTML. A floating chat bubble appears.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconPurple}`}>
              <i className="fas fa-comment-dots" aria-hidden="true" />
            </div>
            <div className={s.cardTitle}>2. Visitor Asks a Question</div>
            <div className={s.cardText}>
              The visitor enters their name and types a question. No email, no sign-up,
              zero friction.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconGreen}`}>
              <i className="fas fa-inbox" aria-hidden="true" />
            </div>
            <div className={s.cardTitle}>3. Agent Gets It in Chatr</div>
            <div className={s.cardText}>
              The message arrives instantly in the agent&rsquo;s Chatr inbox, tagged with a
              &ldquo;Guest&rdquo; badge. No separate dashboard needed.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconOrange}`}>
              <i className="fas fa-comments" aria-hidden="true" />
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

      {/* ── Embed Code ──────────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.grid2}>
            <div>
              <div className={s.sectionTag}>Integration</div>
              <h2 className={s.sectionH2}>Copy. Paste. Done.</h2>
              <p className={s.sectionP}>
                Add the widget to any website with a single script tag. Configure colours, position,
                greeting text, and theme via data attributes. No build step, no npm install, no framework required.
              </p>
              <ul className={s.checkList}>
                <li><i className="fas fa-check" aria-hidden="true" /> Works with React, Vue, Angular, WordPress, Shopify, plain HTML</li>
                <li><i className="fas fa-check" aria-hidden="true" /> No dependencies — standalone JavaScript</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Configure via data attributes or JavaScript API</li>
                <li><i className="fas fa-check" aria-hidden="true" /> CSS is scoped — no style conflicts with your site</li>
              </ul>
            </div>
            <div className={s.codeBlock}>
              <div className={s.codeBlockLabel}>Embed Code</div>
              <pre><code>{`<!-- Paste before </body> -->
<script
  src="https://your-server.com/chatr.js"
  data-server="https://your-server.com"
  data-position="bottom-right"
  data-theme="dark"
  data-primary-color="#3b82f6"
  data-header-color="#1e293b"
  data-greeting="How can we help?"
  data-company="Your Company"
></script>

<!-- That's it. Chat bubble appears. -->`}</code></pre>
            </div>
          </div>
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
              <li><i className="fas fa-check" aria-hidden="true" /> Live chat</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Inbox</li>
              <li><i className="fas fa-times" aria-hidden="true" style={{ color: 'var(--color-red-500)' }} /> Full data ownership</li>
            </ul>
          </div>

          <div className={s.pricingCard}>
            <div className={s.pricingName}>Drift</div>
            <div className={s.pricingPrice}>£50–150</div>
            <div className={s.pricingPeriod}>per seat / month</div>
            <div className={s.pricingDesc}>Sales-focused automation with high price tag.</div>
            <ul className={s.pricingFeatures}>
              <li><i className="fas fa-check" aria-hidden="true" /> Live chat</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Playbooks</li>
              <li><i className="fas fa-times" aria-hidden="true" style={{ color: 'var(--color-red-500)' }} /> Full data ownership</li>
            </ul>
          </div>

          <div className={s.pricingCard}>
            <div className={s.pricingName}>Zendesk Chat</div>
            <div className={s.pricingPrice}>£19–99</div>
            <div className={s.pricingPeriod}>per seat / month</div>
            <div className={s.pricingDesc}>Bundled with ticketing overhead and complexity.</div>
            <ul className={s.pricingFeatures}>
              <li><i className="fas fa-check" aria-hidden="true" /> Live chat</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Triggers</li>
              <li><i className="fas fa-times" aria-hidden="true" style={{ color: 'var(--color-red-500)' }} /> Full data ownership</li>
            </ul>
          </div>

          <div className={`${s.pricingCard} ${s.pricingFeatured}`}>
            <div className={s.pricingBadge}>Your Platform</div>
            <div className={s.pricingName}>Chatr Widget</div>
            <div className={s.pricingPrice}>£0</div>
            <div className={s.pricingPeriod}>forever — you own the code</div>
            <div className={s.pricingDesc}>Full feature set, zero recurring cost, complete ownership.</div>
            <ul className={s.pricingFeatures}>
              <li><i className="fas fa-check" aria-hidden="true" /> Live chat</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Voice, files, links</li>
              <li><i className="fas fa-check" aria-hidden="true" /> White-label branding</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Full data ownership</li>
            </ul>
            <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary} style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }}>
              <i className="fab fa-github" aria-hidden="true" /> Get Started on GitHub
            </a>
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
                <i className="fas fa-comment" aria-hidden="true" />
              </div>
              <div className={s.cardTitle}>Text Messages</div>
              <div className={s.cardText}>
                Real-time delivery with typing indicators and read receipts.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconPurple}`}>
                <i className="fas fa-microphone" aria-hidden="true" />
              </div>
              <div className={s.cardTitle}>Voice Notes</div>
              <div className={s.cardText}>
                Record and send voice messages with waveform playback.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconGreen}`}>
                <i className="fas fa-file-upload" aria-hidden="true" />
              </div>
              <div className={s.cardTitle}>File Sharing</div>
              <div className={s.cardText}>
                Upload images, documents, and files up to 50 MB.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconOrange}`}>
                <i className="fas fa-ellipsis-h" aria-hidden="true" />
              </div>
              <div className={s.cardTitle}>Typing Indicators</div>
              <div className={s.cardText}>
                Both visitor and agent see animated typing indicators.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconRed}`}>
                <i className="fas fa-check-double" aria-hidden="true" />
              </div>
              <div className={s.cardTitle}>Read Receipts</div>
              <div className={s.cardText}>
                Sent, delivered, and read — full delivery tracking.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconSlate}`}>
                <i className="fas fa-link" aria-hidden="true" />
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

      {/* ── Platform Compatibility ──────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <p className={s.sectionTag}>Compatibility</p>
            <h2 className={s.sectionH2}>Works everywhere your customers are</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              The widget is a single JavaScript file with zero dependencies. It works on any
              platform that supports a &lt;script&gt; tag.
            </p>
          </div>

          <div className={s.grid3} style={{ marginTop: '2rem' }}>
            {[
              { icon: 'fab fa-react', title: 'React / Next.js', text: 'Add to _app.tsx or layout.tsx. Works with SSR and client-side rendering.' },
              { icon: 'fab fa-vuejs', title: 'Vue / Nuxt', text: 'Drop into your main template or Nuxt plugin. Reactive and non-blocking.' },
              { icon: 'fab fa-angular', title: 'Angular', text: 'Add to index.html or load dynamically in a component. Zone-safe.' },
              { icon: 'fab fa-wordpress', title: 'WordPress', text: 'Paste into your theme footer.php or use a custom HTML widget. No plugin needed.' },
              { icon: 'fab fa-shopify', title: 'Shopify', text: 'Add to theme.liquid before the closing body tag. Works with all Shopify themes.' },
              { icon: 'fas fa-code', title: 'Plain HTML', text: 'Any static or dynamic site. Paste the script tag and you\'re done. No build step.' },
            ].map(f => (
              <div key={f.title} className={s.card} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', color: 'var(--color-blue-500)', marginBottom: '0.75rem' }}>
                  <i className={f.icon} aria-hidden="true" />
                </div>
                <div className={s.cardTitle}>{f.title}</div>
                <div className={s.cardText}>{f.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── JavaScript API ───────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <p className={s.sectionTag}>Advanced</p>
          <h2 className={s.sectionH2}>Programmatic Control</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Need more control? The widget exposes a JavaScript API for programmatic
            open/close, theme switching, and event hooks.
          </p>
        </div>

        <div className={s.grid2}>
          <div className={s.codeBlock}>
            <div className={s.codeBlockLabel}>JavaScript API</div>
            <pre><code>{`// Open the widget programmatically
window.ChatrWidget.open();

// Close it
window.ChatrWidget.close();

// Toggle visibility
window.ChatrWidget.toggle();

// Update theme at runtime
window.ChatrWidget.setTheme('light');

// Set custom greeting
window.ChatrWidget.setGreeting(
  'Welcome back! How can we help?'
);`}</code></pre>
          </div>
          <div>
            <ul className={s.checkList} style={{ marginTop: 0 }}>
              <li><i className="fas fa-check" aria-hidden="true" /> Open widget on button click</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Trigger from onboarding flows</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Match your app&rsquo;s theme dynamically</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Customise greeting per page</li>
              <li><i className="fas fa-check" aria-hidden="true" /> Hide on specific routes</li>
              <li><i className="fas fa-check" aria-hidden="true" /> No DOM conflicts — scoped styles</li>
            </ul>

            <div className={s.highlight} style={{ marginTop: '1.5rem' }}>
              <p>
                <strong>Zero framework lock-in:</strong> The widget is vanilla JavaScript. It doesn&rsquo;t
                import React, Vue, or any framework. It injects its own DOM and manages its own state —
                no conflicts with your application.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── The Business Case ──────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <p className={s.sectionTag}>Business Case</p>
            <h2 className={s.sectionH2}>The widget alone pays for the project</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              Live chat is a growing market. Companies pay £39–99 per seat per month for tools like
              Intercom, Drift, and Zendesk. The Chatr widget delivers equivalent functionality at
              zero recurring cost.
            </p>
          </div>

          <div className={s.grid3}>
            <div className={s.valueCard}>
              <div className={s.valueIcon}><i className="fas fa-chart-line" aria-hidden="true" /></div>
              <div className={s.valueTitle}>Resell as SaaS</div>
              <div className={s.valueText}>Deploy per-client instances and charge a monthly fee. Your cost: one server per client (~£15/month). Their alternative: £39–99/seat/month on Intercom.</div>
            </div>
            <div className={s.valueCard}>
              <div className={s.valueIcon}><i className="fas fa-box-open" aria-hidden="true" /></div>
              <div className={s.valueTitle}>Bundle with Your Product</div>
              <div className={s.valueText}>Add live customer support to your existing SaaS product. Increase retention, reduce churn, and differentiate from competitors — all with code you own.</div>
            </div>
            <div className={s.valueCard}>
              <div className={s.valueIcon}><i className="fas fa-handshake" aria-hidden="true" /></div>
              <div className={s.valueTitle}>Agency White-Label</div>
              <div className={s.valueText}>Offer live chat as a managed service to your clients. Custom branding per client with the palette designer. Scale without per-seat overhead.</div>
            </div>
          </div>

          <div className={s.highlight}>
            <p>
              <strong>Market context:</strong> The live chat software market is projected to reach $1.7 billion by 2030.
              Intercom alone is valued at over $1 billion. Chatr gives you a production-ready entry point into
              this market — tested, deployed, and ready to customise.
            </p>
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
                <i className="fas fa-play-circle" aria-hidden="true" /> Live Widget Demo
              </Link>
              <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
                <i className="fab fa-github" aria-hidden="true" /> View on GitHub
              </a>
              <Link href="/product" className={s.btnSecondary}>
                <i className="fas fa-book-open" aria-hidden="true" /> Full Product Overview
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
