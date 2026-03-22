'use client';

import Image from 'next/image';
import Link from 'next/link';
import SiteNav from '@/components/site/SiteNav';
import SiteFooter from '@/components/site/SiteFooter';
import { useBodyScroll } from '@/components/site/useBodyScroll';
import s from '@/components/site/Site.module.css';

const SS = '/screenshots';

export default function FeaturesPage() {
  useBodyScroll();
  return (
    <div className={s.page}>
      <SiteNav />

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className={s.heroSection}>
        <div className={s.heroGradient} />
        <div className={s.heroInner}>
          <span className={s.heroTag}>50+ Features</span>
          <h1 className={s.heroH1}>
            Everything you need in a{' '}
            <span className={s.accent}>messaging platform</span>
          </h1>
          <p className={s.heroP}>
            Seven message types, real-time presence, typing indicators, reactions, replies,
            group chats, AI assistant, embeddable widget — matching the feature sets of
            WhatsApp, Slack, and iMessage in a single platform.
          </p>
          <div className={s.heroCtas}>
            <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
              <i className="fab fa-github" /> View on GitHub
            </a>
            <Link href="/pricing" className={s.btnSecondary}>
              <i className="fas fa-tag" /> Compare Options
            </Link>
          </div>
        </div>
      </section>

      {/* ── Seven Message Types ───────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <p className={s.sectionTag}>Messaging</p>
          <h2 className={s.sectionH2}>Seven Message Types</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Text, voice, images, video, files, link previews, and syntax-highlighted code blocks —
            every format your team needs.
          </p>
        </div>

        <div className={s.grid3}>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconBlue}`}>
              <i className="fas fa-comment-dots" />
            </div>
            <div className={s.cardTitle}>Text Messages</div>
            <div className={s.cardText}>
              Instant delivery with read receipts, date separators, and message grouping.
              Under 100ms end-to-end.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconPurple}`}>
              <i className="fas fa-microphone" />
            </div>
            <div className={s.cardTitle}>Voice Messages</div>
            <div className={s.cardText}>
              Record voice notes with waveform visualisation, playback controls, and
              &ldquo;listened&rdquo; receipts.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconGreen}`}>
              <i className="fas fa-image" />
            </div>
            <div className={s.cardTitle}>Image Sharing</div>
            <div className={s.cardText}>
              Inline previews with fullscreen lightbox. Server-side Sharp processing generates
              thumbnail, medium, and full-res variants.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconRed}`}>
              <i className="fas fa-video" />
            </div>
            <div className={s.cardTitle}>Video Sharing</div>
            <div className={s.cardText}>
              Inline video player with thumbnail, duration badge, and standard playback controls.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconOrange}`}>
              <i className="fas fa-paperclip" />
            </div>
            <div className={s.cardTitle}>File Attachments</div>
            <div className={s.cardText}>
              PDFs, Word, Excel, ZIP — up to 50 MB. Type-specific icons, file name, size, and
              one-tap download.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconSlate}`}>
              <i className="fas fa-link" />
            </div>
            <div className={s.cardTitle}>Link Previews</div>
            <div className={s.cardText}>
              URLs auto-fetched for Open Graph metadata — title, description, image, and favicon
              rendered as rich cards.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconPurple}`}>
              <i className="fas fa-code" />
            </div>
            <div className={s.cardTitle}>Code Blocks</div>
            <div className={s.cardText}>
              Syntax highlighting for 40+ languages with automatic detection and a copy button.
            </div>
          </div>
        </div>

        <div className={s.screenshotRow}>
          <Image src={`${SS}/04-chat-view.png`} alt="Chat view" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/04b-chat-view-top.png`} alt="Chat view top" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/41-code-block.png`} alt="Code block" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
        </div>
      </div>

      {/* ── Real-Time Awareness ───────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <p className={s.sectionTag}>Real-Time</p>
            <h2 className={s.sectionH2}>Real-Time Awareness</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              Users always know who is online, who is typing, and who has read their message —
              instant feedback at every level.
            </p>
          </div>

          <div className={s.grid3}>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconBlue}`}>
                <i className="fas fa-ellipsis-h" />
              </div>
              <div className={s.cardTitle}>Typing Indicators</div>
              <div className={s.cardText}>
                Animated &ldquo;typing…&rdquo; with bouncing dots — visible in both the chat
                and the conversation list.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconPurple}`}>
                <i className="fas fa-ghost" />
              </div>
              <div className={s.cardTitle}>Ghost Typing</div>
              <div className={s.cardText}>
                See every character the other person types in real time, letter by letter.
                No mainstream app offers this.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconGreen}`}>
                <i className="fas fa-check-double" />
              </div>
              <div className={s.cardTitle}>Read Receipts</div>
              <div className={s.cardText}>
                Three states — sending (clock), delivered (tick), read (blue double tick).
                Voice messages add a &ldquo;listened&rdquo; state.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconOrange}`}>
                <i className="fas fa-circle" />
              </div>
              <div className={s.cardTitle}>Online Presence</div>
              <div className={s.cardText}>
                Green (online), amber (away), grey (offline) dots on every avatar. &ldquo;Last
                seen&rdquo; for offline contacts.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconRed}`}>
                <i className="fas fa-record-vinyl" />
              </div>
              <div className={s.cardTitle}>Recording Indicator</div>
              <div className={s.cardText}>
                When someone is recording a voice note, the other participant sees a live
                &ldquo;recording…&rdquo; indicator.
              </div>
            </div>
            <div className={s.card}>
              <div className={`${s.cardIcon} ${s.iconSlate}`}>
                <i className="fas fa-brain" />
              </div>
              <div className={s.cardTitle}>Smart Summaries</div>
              <div className={s.cardText}>
                AI-generated one-line summaries replace the last message on the conversation
                list. Scan every thread at a glance.
              </div>
            </div>
          </div>

          <div className={s.screenshotRow}>
            <Image src={`${SS}/26-typing-in-chat.png`} alt="Typing in chat" width={200} height={400}
              className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
            <Image src={`${SS}/25-typing-chat-list.png`} alt="Typing on chat list" width={200} height={400}
              className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          </div>
        </div>
      </div>

      {/* ── Message Interactions ──────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <p className={s.sectionTag}>Interactions</p>
          <h2 className={s.sectionH2}>Message Interactions</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            React, reply, edit, unsend — every message is interactive. Full emoji picker,
            offline queue, and edit history.
          </p>
        </div>

        <div className={s.grid3}>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconOrange}`}>
              <i className="fas fa-smile" />
            </div>
            <div className={s.cardTitle}>Reactions</div>
            <div className={s.cardText}>
              Tap-and-hold to add emoji badges below any message. Multiple reactions per message
              from different users.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconBlue}`}>
              <i className="fas fa-reply" />
            </div>
            <div className={s.cardTitle}>Replies</div>
            <div className={s.cardText}>
              Swipe right or use the context menu to reply. Quoted preview with sender,
              content type, and truncated text.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconGreen}`}>
              <i className="fas fa-pen" />
            </div>
            <div className={s.cardTitle}>Edit Messages</div>
            <div className={s.cardText}>
              Edit any sent message with up-arrow shortcut. &ldquo;(edited)&rdquo; label shown.
              Full edit history stored for audit.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconRed}`}>
              <i className="fas fa-trash-alt" />
            </div>
            <div className={s.cardTitle}>Unsend Messages</div>
            <div className={s.cardText}>
              Delete for everyone — message replaced with a &ldquo;deleted&rdquo; placeholder,
              equivalent to WhatsApp&rsquo;s &ldquo;Delete for Everyone&rdquo;.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconPurple}`}>
              <i className="fas fa-grin-beam" />
            </div>
            <div className={s.cardTitle}>Emoji Picker</div>
            <div className={s.cardText}>
              Full emoji picker with category tabs, search, and a recently-used section.
            </div>
          </div>
          <div className={s.card}>
            <div className={`${s.cardIcon} ${s.iconSlate}`}>
              <i className="fas fa-wifi" />
            </div>
            <div className={s.cardTitle}>Offline Support</div>
            <div className={s.cardText}>
              Messages sent offline are queued locally and delivered automatically when the
              connection restores. IndexedDB cache.
            </div>
          </div>
        </div>

        <div className={s.screenshotRow}>
          <Image src={`${SS}/42-reactions.png`} alt="Reactions" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/43-reply-thread.png`} alt="Reply thread" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/22-emoji-picker.png`} alt="Emoji picker" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
        </div>
      </div>

      {/* ── Contact CTA banner ───────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter} style={{ maxWidth: 640, margin: '0 auto' }}>
            <h2 className={`${s.sectionH2} ${s.sectionCenter}`}>All of this — free &amp; open source</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter} ${s.sectionCenter}`}>
              Chatr delivers all of this out of the box — MIT-licensed, no per-seat fees, no vendor lock-in.
              Clone the repo and deploy on your own infrastructure.
            </p>
            <div className={s.heroCtas} style={{ marginTop: '1.25rem' }}>
              <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
                <i className="fab fa-github" /> Get the Source
              </a>
              <Link href="/docs" className={s.btnSecondary}>
                <i className="fas fa-book" /> Documentation
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Groups & Social ───────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <p className={s.sectionTag}>Social</p>
            <h2 className={s.sectionH2}>Groups &amp; Social</h2>
          </div>

          <div className={s.grid2}>
            <div>
              <p className={s.sectionP} style={{ maxWidth: 'none' }}>
                Full-featured group chats with role management (Owner, Admin, Member), invite
                controls, and a social layer. Create groups with names, avatars, cover images,
                and descriptions. All seven message types are supported inside groups.
              </p>
              <p className={s.sectionP} style={{ maxWidth: 'none', marginTop: '1rem' }}>
                <strong>Friends &amp; Blocking</strong> — Send friend requests via search. Accepted
                contacts show a &ldquo;Friend&rdquo; badge. Blocked users cannot search for you,
                message you, view your profile, or see your online status.
              </p>
              <p className={s.sectionP} style={{ maxWidth: 'none', marginTop: '1rem' }}>
                <strong>Invitations</strong> — Owners and Admins invite new members via search.
                Pending invitations appear as a badge on the Groups tab.
              </p>
            </div>
            <div className={s.screenshotRow} style={{ marginTop: 0 }}>
              <Image src={`${SS}/06-groups.png`} alt="Groups" width={200} height={400}
                className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
              <Image src={`${SS}/05-friends.png`} alt="Friends" width={200} height={400}
                className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Design & Themes ───────────────────────────────── */}
      <div className={s.section}>
        <div className={s.sectionCenter}>
          <p className={s.sectionTag}>Design</p>
          <h2 className={s.sectionH2}>Design &amp; Themes</h2>
          <p className={`${s.sectionP} ${s.sectionPCenter}`}>
            Dark and light themes with a single-tap toggle. No reload, no flicker.
            Deep navy dark theme optimised for OLED screens.
          </p>
        </div>

        <div className={s.screenshotRow}>
          <Image src={`${SS}/18-dark-theme.png`} alt="Dark theme" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/27-dark-theme-chat.png`} alt="Dark theme chat" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/19-light-theme.png`} alt="Light theme" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
          <Image src={`${SS}/36-light-theme-chat.png`} alt="Light theme chat" width={200} height={400}
            className={s.screenshotMobile} style={{ width: 200, height: 'auto' }} />
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────── */}
      <div className={s.sectionAlt}>
        <div className={s.section}>
          <div className={s.sectionCenter}>
            <h2 className={s.sectionH2}>Ready to see more?</h2>
            <p className={`${s.sectionP} ${s.sectionPCenter}`}>
              Try the embeddable support widget or explore the full product overview with
              architecture details, screenshots, and commercial analysis.
            </p>
            <div className={s.heroCtas}>
              <Link href="/widget" className={s.btnPrimary}>
                <i className="fas fa-puzzle-piece" /> Explore the Widget
              </Link>
              <a href="https://github.com/neofuture/chatr" target="_blank" rel="noopener noreferrer" className={s.btnPrimary}>
                <i className="fab fa-github" /> View on GitHub
              </a>
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
