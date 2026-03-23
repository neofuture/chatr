'use client';

import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { useBodyScroll } from '@/components/site/useBodyScroll';
import s from '@/components/site/Site.module.css';

const INTERCOM_ITEMS = [
  { icon: 'fas fa-pound-sign', text: '£39–99 per seat, per month' },
  { icon: 'fas fa-ban', text: 'Usage caps and overage charges' },
  { icon: 'fas fa-lock', text: 'Vendor lock-in — closed source' },
  { icon: 'fas fa-paint-brush', text: 'Limited customisation options' },
  { icon: 'fas fa-server', text: 'Your data on their servers' },
  { icon: 'fas fa-credit-card', text: 'Monthly bills that never stop' },
];

const CHATR_ITEMS = [
  { icon: 'fas fa-code', text: 'Open source (MIT) — yours forever' },
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
  { icon: 'fas fa-vial', color: s.iconGreen, title: '2,800+ Tests', text: 'Three-tier automated testing — 1,475 frontend, 1,133 backend, 168 end-to-end with Playwright.' },
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
      <main id="main-content">

      {/* Hero */}
      <section className={s.heroSection}>
        <div className={s.heroGradient} aria-hidden="true" />
        <div className={s.heroInner}>
          <span className={s.heroTag}>Pricing &amp; Support</span>
          <h1 className={s.heroH1}>
            Free code. <span className={s.accent}>Expert support from £15/hr.</span>
          </h1>
          <p className={s.heroP}>
            Chatr is MIT-licensed — clone, deploy, and own it forever at zero cost.
            Need a hand getting set up? Our paid support starts at just £15/hour,
            with monthly plans that save you even more.
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
                <li key={i}><i className={item.icon} aria-hidden="true" /> {item.text}</li>
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
            <div className={s.pricingDesc}>Full-featured, open source, MIT-licensed. Clone, deploy, own it forever.</div>
            <ul className={s.pricingFeatures}>
              {CHATR_ITEMS.map((item, i) => (
                <li key={i}><i className={item.icon} aria-hidden="true" /> {item.text}</li>
              ))}
            </ul>
            <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
              <i className="fab fa-github" aria-hidden="true" /> Get Started on GitHub
            </a>
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
                <li key={i}><i className={item.icon} aria-hidden="true" /> {item.text}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Support Packages */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={`${s.sectionTag} ${s.sectionCenter}`}>Support</div>
          <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>The code is free. Expert support isn&rsquo;t.</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
            Chatr is MIT-licensed and always will be. But if you need help with setup, deployment,
            customisation, or troubleshooting — we&rsquo;re here at £15/hour.
          </p>

          <div className={s.grid4} style={{ marginTop: '2.5rem' }}>
            {/* Community */}
            <div className={s.pricingCard}>
              <div className={s.pricingName}>Community</div>
              <div className={s.pricingPrice}>£0</div>
              <div className={s.pricingPeriod}>forever</div>
              <div className={s.pricingDesc}>Self-service with docs, guides, and the open source community.</div>
              <ul className={s.pricingFeatures}>
                <li><i className="fas fa-check" aria-hidden="true" /> Full source code (MIT)</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Getting Started guide</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Documentation &amp; API reference</li>
                <li><i className="fas fa-check" aria-hidden="true" /> GitHub Issues</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Community discussions</li>
              </ul>
              <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnSecondary} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                <i className="fab fa-github" aria-hidden="true" /> Get Started
              </a>
            </div>

            {/* Pay As You Go */}
            <div className={s.pricingCard}>
              <div className={s.pricingName}>Pay As You Go</div>
              <div className={s.pricingPrice}>£15</div>
              <div className={s.pricingPeriod}>per hour</div>
              <div className={s.pricingDesc}>Book expert time whenever you need it. No commitment, no minimum.</div>
              <ul className={s.pricingFeatures}>
                <li><i className="fas fa-check" aria-hidden="true" /> Everything in Community</li>
                <li><i className="fas fa-check" aria-hidden="true" /> 1-on-1 expert support</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Setup &amp; deployment help</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Troubleshooting &amp; debugging</li>
                <li><i className="fas fa-check" aria-hidden="true" /> 48-hour response time</li>
              </ul>
              <Link href="/contact" className={s.btnSecondary} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                <i className="fas fa-envelope" aria-hidden="true" /> Book Hours
              </Link>
            </div>

            {/* Starter */}
            <div className={`${s.pricingCard} ${s.pricingFeatured}`}>
              <span className={s.pricingBadge}>Most Popular</span>
              <div className={s.pricingName}>Starter</div>
              <div className={s.pricingPrice}>£99</div>
              <div className={s.pricingPeriod}>per month — 8 hours included</div>
              <div className={s.pricingDesc}>Perfect for getting set up and keeping things running smoothly.</div>
              <ul className={s.pricingFeatures}>
                <li><i className="fas fa-check" aria-hidden="true" /> Everything in Pay As You Go</li>
                <li><i className="fas fa-check" aria-hidden="true" /> 8 hours/month (£12.38/hr)</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Additional hours at £12/hr</li>
                <li><i className="fas fa-check" aria-hidden="true" /> 24-hour response time</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Email &amp; video call support</li>
                <li><i className="fas fa-check" aria-hidden="true" /> AWS deployment assistance</li>
              </ul>
              <Link href="/contact" className={s.btnPrimary} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                <i className="fas fa-rocket" aria-hidden="true" /> Get Started
              </Link>
            </div>

            {/* Professional */}
            <div className={s.pricingCard}>
              <div className={s.pricingName}>Professional</div>
              <div className={s.pricingPrice}>£249</div>
              <div className={s.pricingPeriod}>per month — 20 hours included</div>
              <div className={s.pricingDesc}>For teams that need ongoing support, customisation, and priority response.</div>
              <ul className={s.pricingFeatures}>
                <li><i className="fas fa-check" aria-hidden="true" /> Everything in Starter</li>
                <li><i className="fas fa-check" aria-hidden="true" /> 20 hours/month (£12.45/hr)</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Additional hours at £10/hr</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Same-day response</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Custom feature development</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Priority bug fixes</li>
                <li><i className="fas fa-check" aria-hidden="true" /> Architecture &amp; scaling advice</li>
              </ul>
              <Link href="/contact" className={s.btnSecondary} style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                <i className="fas fa-envelope" aria-hidden="true" /> Contact Us
              </Link>
            </div>
          </div>

          <div className={s.highlight}>
            <p>
              <strong>What&rsquo;s included in support:</strong> Setup and installation, AWS/cloud deployment, environment
              configuration, database migrations, Nginx &amp; SSL setup, widget integration, custom branding, feature
              customisation, performance tuning, troubleshooting, and architecture guidance. Anything you need to get
              Chatr working for your business.
            </p>
          </div>
        </div>
      </div>

      {/* Cost of Delay */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <div className={s.sectionTag}>Cost of Delay</div>
          <h2 className={s.sectionH2}>Every month you pay SaaS is money you&rsquo;ll never get back</h2>
        </div>

        <table className={s.comparisonTable}>
          <caption className={s.srOnly}>Cost comparison: Intercom vs Chatr by team size</caption>
          <thead>
            <tr>
              <th scope="col">Team Size</th>
              <th scope="col">Intercom /year</th>
              <th scope="col" className={s.featuredCol}>Chatr /year</th>
              <th scope="col">You Save</th>
              <th scope="col">5-Year Savings</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['5 agents', '£2,340', '£0', '£2,340', '£11,700'],
              ['10 agents', '£4,680', '£0', '£4,680', '£23,400'],
              ['25 agents', '£11,700', '£0', '£11,700', '£58,500'],
              ['50 agents', '£23,400', '£0', '£23,400', '£117,000'],
              ['100 agents', '£46,800', '£0', '£46,800', '£234,000'],
            ].map(([size, intercom, chatr, save, fiveYr]) => (
              <tr key={size}>
                <td>{size}</td>
                <td>{intercom}</td>
                <td className={`${s.featuredCol} ${s.cellYes}`}>{chatr}</td>
                <td className={s.cellYes}>{save}</td>
                <td style={{ fontWeight: 700 }}>{fiveYr}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={s.highlight}>
          <p>
            <strong>Infrastructure cost:</strong> A single AWS EC2 t3.small (~£15/month) runs the entire
            Chatr platform — backend, frontend, and widget. Add RDS and ElastiCache for managed databases
            and you&rsquo;re still under £100/month total, regardless of team size.
          </p>
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
                  <i className={item.icon} aria-hidden="true" />
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
            <div className={s.statVal}>30</div>
            <div className={s.statLbl}>Days Built</div>
          </div>
          <div className={s.statBox}>
            <div className={s.statVal}>2,800+</div>
            <div className={s.statLbl}>Tests</div>
          </div>
        </div>
      </div>

      {/* ROI Analysis */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={`${s.sectionTag} ${s.sectionCenter}`}>Return on Investment</div>
          <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>The maths speak for themselves</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
            Replace SaaS subscriptions with a platform you own. Savings grow with every seat.
          </p>

          <div className={s.grid3} style={{ marginTop: '2rem' }}>
            <div className={s.valueCard}>
              <div className={s.valueIcon}><i className="fas fa-user-friends" aria-hidden="true" /></div>
              <div className={s.valueTitle}>10-Person Team</div>
              <div className={s.valueStat}>£4,700/yr</div>
              <div className={s.valueText}>saved vs. Intercom at £39/seat/month. That&rsquo;s £23,500 over 5 years.</div>
            </div>
            <div className={s.valueCard}>
              <div className={s.valueIcon}><i className="fas fa-building" aria-hidden="true" /></div>
              <div className={s.valueTitle}>50-Person Team</div>
              <div className={s.valueStat}>£23,400/yr</div>
              <div className={s.valueText}>saved vs. Intercom. Over 5 years, that&rsquo;s £117,000 back in your budget.</div>
            </div>
            <div className={s.valueCard}>
              <div className={s.valueIcon}><i className="fas fa-globe" aria-hidden="true" /></div>
              <div className={s.valueTitle}>White-Label Reseller</div>
              <div className={s.valueStat}>Unlimited</div>
              <div className={s.valueText}>Deploy per-client instances. Charge clients a flat fee while your cost stays at £0/seat.</div>
            </div>
          </div>

          <div className={s.highlight}>
            <p>
              <strong>Total cost of ownership:</strong> Chatr costs nothing to license. Your only expense is infrastructure —
              a single AWS EC2 instance (from ~£15/month) runs the entire platform. Compare that to £39–99/seat/month
              for Intercom, Drift, or Zendesk.
            </p>
          </div>
        </div>
      </div>

      {/* What it would cost to build */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <div className={s.sectionTag}>Build vs Buy</div>
          <h2 className={s.sectionH2}>What you&rsquo;d need to build this from scratch</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            The roles, timeline, and budget required to replicate Chatr&rsquo;s feature set
            with an in-house or agency team.
          </p>
        </div>

        <table className={s.comparisonTable}>
          <caption className={s.srOnly}>Estimated cost to build equivalent from scratch</caption>
          <thead>
            <tr>
              <th scope="col">Role / Resource</th>
              <th scope="col">Duration</th>
              <th scope="col">Est. Cost (UK)</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Senior Full-Stack Developer', '6 months', '£45,000–£60,000'],
              ['UI/UX Designer', '3 months', '£15,000–£25,000'],
              ['DevOps / Infrastructure Engineer', '2 months', '£12,000–£18,000'],
              ['QA / Test Engineer', '3 months', '£15,000–£22,000'],
              ['Project Manager', '6 months', '£20,000–£30,000'],
              ['AWS Infrastructure (dev + staging + prod)', '6 months', '£3,000–£6,000'],
              ['Third-party services (email, SMS, AI)', '6 months', '£1,500–£3,000'],
            ].map(([role, duration, cost]) => (
              <tr key={role}>
                <td>{role}</td>
                <td>{duration}</td>
                <td>{cost}</td>
              </tr>
            ))}
            <tr>
              <td style={{ fontWeight: 800, color: 'var(--color-red-400)' }}>Total Estimate</td>
              <td style={{ fontWeight: 700 }}>3–6 months</td>
              <td style={{ fontWeight: 800, color: 'var(--color-red-400)' }}>£111,500–£164,000</td>
            </tr>
          </tbody>
        </table>

        <div className={s.highlight}>
          <p>
            <strong>And that&rsquo;s before</strong> ongoing maintenance, bug fixes, security patches, dependency
            updates, and feature requests. Chatr delivers all of this today — built, tested, documented,
            deployed, and ready to customise.
          </p>
        </div>
      </div>

      {/* Revenue Models */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={`${s.sectionTag} ${s.sectionCenter}`}>Revenue Models</div>
          <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>Four ways to monetise Chatr</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
            Own the code, own the revenue stream. Here&rsquo;s how businesses are turning
            open-source chat platforms into recurring income.
          </p>

          <div className={s.grid2} style={{ marginTop: '2rem' }}>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconBlue}`}><i className="fas fa-cloud" aria-hidden="true" /></div>
              <div className={s.cardTitle}>Managed SaaS</div>
              <div className={s.cardText}>
                Host Chatr as a multi-tenant service. Charge £10–50/month per workspace.
                One server handles dozens of small teams. Your margins: 80%+.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconGreen}`}><i className="fas fa-store" aria-hidden="true" /></div>
              <div className={s.cardTitle}>White-Label Reselling</div>
              <div className={s.cardText}>
                Deploy branded instances for agency clients. Custom domains, logos, and colour
                schemes via the palette designer. Charge per client, not per seat.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconPurple}`}><i className="fas fa-puzzle-piece" aria-hidden="true" /></div>
              <div className={s.cardTitle}>Product Integration</div>
              <div className={s.cardText}>
                Embed the widget or full messaging into your existing SaaS product.
                Differentiate from competitors. Reduce churn with in-app support.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconOrange}`}><i className="fas fa-file-contract" aria-hidden="true" /></div>
              <div className={s.cardTitle}>Enterprise Licensing</div>
              <div className={s.cardText}>
                Sell on-premise licenses to compliance-sensitive organisations (healthcare, finance, government).
                They get data sovereignty; you get recurring licence fees.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acquisition Opportunity */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <div className={s.sectionTag}>For Acquirers</div>
          <h2 className={s.sectionH2}>A turnkey messaging product</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Chatr isn&rsquo;t a prototype. It&rsquo;s a production-deployed, fully tested product
            with documented architecture and immediate commercial potential.
          </p>
        </div>

        <div className={s.grid3}>
          {[
            { icon: 'fa-box-open', color: s.iconBlue, title: 'Ship-Ready IP', text: '82,000+ lines of TypeScript across frontend, backend, widget, and tooling. 2,800+ automated tests. Deployed on AWS.' },
            { icon: 'fa-pound-sign', color: s.iconGreen, title: 'Revenue Potential', text: 'The embeddable widget competes directly with Intercom (£39–99/seat/month). Offer it as SaaS, sell per-instance licenses, or bundle with your product.' },
            { icon: 'fa-cogs', color: s.iconPurple, title: 'Integration Ready', text: 'REST API with 88 endpoints, 85+ WebSocket events, Prisma ORM, and modular architecture. Integrate into existing products or operate standalone.' },
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

        <div className={s.highlight}>
          <p>
            <strong>Estimated build cost:</strong> An agency or team would spend £50,000–£150,000+ and 3–6 months
            to build equivalent functionality. Chatr delivers it today — tested, documented, and deployed.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className={s.sectionAlt}>
        <div className={`${s.section} ${s.sectionCenter}`}>
          <h2 className={s.sectionH2}>Ready to get started?</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Clone the repo for free — or book expert support to get running fast.
          </p>
          <div className={s.heroCtas}>
            <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
              <i className="fab fa-github" aria-hidden="true" /> View on GitHub
            </a>
            <Link href="/contact" className={s.btnPrimary}>
              <i className="fas fa-headset" aria-hidden="true" /> Book Support
            </Link>
            <Link href="/product" className={s.btnSecondary}>
              Full Product Overview <i className="fas fa-book-open" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      </main>
      <SiteFooter />
    </div>
  );
}
