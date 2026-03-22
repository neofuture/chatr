# Chatr — Real-Time Messaging Platform

## The Pitch

Chatr is a **full-stack, production-grade real-time messaging platform** — built from the ground up as a single-developer effort. It covers direct messaging, group chat, friend management, voice messaging, file sharing, embeddable support widgets, AI-powered features, and a developer analytics dashboard — all wrapped in a mobile-first, accessible UI with 2,700+ automated tests.

This isn't a tutorial project. This is a **deployable product** with the architecture, testing rigour, and operational tooling that enterprise teams ship.

---

## What It Does

Chatr lets users **sign up, verify their identity, message each other in real-time, form groups, share media, and manage relationships** — across desktop and mobile browsers, with an embeddable widget for customer support.

Every message, typing indicator, presence update, and reaction happens in real-time over WebSockets. Offline? Messages queue locally and sync when you're back.

---

## Feature Breakdown

### 1. Authentication & Security

| Feature | Detail |
|---------|--------|
| Email + password registration | With server-side validation and password strength meter |
| Email verification | 6-digit OTP delivered via Mailtrap |
| Phone verification | SMS OTP via SMS Works API (UK mobile) |
| Two-factor authentication | TOTP via QR code or manual secret (Speakeasy) |
| Login verification | Additional OTP challenge on login (SMS or email) |
| Password reset | Email-based reset flow with branded templates |
| JWT auth | 7-day tokens, Redis blacklist on logout |
| Rate limiting | Redis-backed per-route limits (5 registrations/15min, 10 logins/15min) |
| Security headers | Helmet middleware, CORS, token blacklisting |

### 2. Real-Time Messaging

| Feature | Detail |
|---------|--------|
| Direct messages | 1:1 real-time text with delivery and read receipts |
| Group messaging | Multi-user rooms with per-group message history |
| Typing indicators | Live "user is typing..." with timeout |
| Ghost typing | See what the other person is typing in real-time, character by character |
| Message editing | Edit sent messages with full edit history preserved |
| Unsend messages | Soft-delete with "message removed" placeholder |
| Emoji reactions | React to any message, toggle on/off |
| Reply-to | Quote and reply to specific messages |
| Link previews | Auto-fetched Open Graph / oEmbed cards |
| Code blocks | Syntax-highlighted code in messages with copy button |
| Offline queue | Messages queued in IndexedDB, auto-synced on reconnect |

### 3. Voice & Media

| Feature | Detail |
|---------|--------|
| Voice recording | In-app recorder with live waveform visualisation |
| Audio playback | Custom player with waveform, duration, and play/pause |
| Audio listening status | See when someone is listening to your voice message |
| Image sharing | Upload and view images in chat with lightbox |
| File sharing | Send documents, PDFs, videos, archives (up to 50MB) |
| Profile image upload | Crop, resize, and upload profile photos |
| Cover image upload | Banner-style cover photo with crop tool |
| Image processing | Server-side Sharp resizing (multiple variants: 400px, 320px, 96px) |
| S3 storage | Production file storage on AWS S3, local dev fallback |

### 4. Presence & Status

| Feature | Detail |
|---------|--------|
| Online/Away/Offline | Real-time presence via Socket.IO + Redis |
| Last seen | "Last seen 5 minutes ago" / "Last seen at 3:42 PM" / "Last seen on Mar 12 at 9:15 AM" |
| Privacy controls | Hide online status, phone, email, full name, gender, join date |
| Blocked user handling | Blocked users can't see presence, send messages, or find you in search |

### 5. Friends & Relationships

| Feature | Detail |
|---------|--------|
| Friend requests | Send, accept, decline, cancel |
| Friends list | Searchable list with presence indicators |
| Block/unblock | Full block with bidirectional enforcement |
| Message requests | Non-friends land in a "Requests" tab — accept or decline |

### 6. Groups

| Feature | Detail |
|---------|--------|
| Create groups | Name, description, invite members |
| Member roles | Owner, Admin, Member — with role-based permissions |
| Promote/demote | Admins can be promoted or demoted |
| Transfer ownership | Owners can hand off the group |
| Group profile | Group avatar, cover image, member list |
| Group invites | Pending invite tab with accept/decline |
| AI summaries | GPT-4o-mini generated conversation summaries for groups and DMs |

### 7. Embeddable Support Widget

| Feature | Detail |
|---------|--------|
| Drop-in script tag | One line of HTML to embed on any website |
| Guest sessions | Visitors chat without creating an account (24h session persistence) |
| Real-time messaging | Full Socket.IO integration for live chat |
| File uploads | Images, documents, audio — from the widget |
| Customisable | Accent colours, title, greeting message, light/dark/auto theme |
| Widget designer | Visual palette tool with presets and live embed snippet |
| Lightweight | Vanilla JS, no framework dependency, Terser-minified |

### 8. User Experience

| Feature | Detail |
|---------|--------|
| Mobile-first design | Responsive layout with bottom navigation and safe area support |
| Dark/light theme | System-aware with manual toggle, persisted to localStorage |
| Sliding panels | Stacked panel system (up to 4 deep) for profiles, settings, groups |
| Bottom sheets | iOS-style sheets for forms and actions |
| Toast notifications | Success, error, info, warning — with auto-dismiss |
| Confirmation dialogs | Urgency-aware (danger/warning) with accessible markup |
| Route preloading | Critical routes prefetched for instant navigation |
| Animated transitions | Framer Motion page transitions |
| Emoji picker | Categorised grid, search, recent history |

### 9. Accessibility

| Feature | Detail |
|---------|--------|
| ARIA roles | `role="article"`, `role="dialog"`, `role="log"`, `role="status"`, `role="tablist"` throughout |
| Live regions | `aria-live="polite"` for messages and typing indicators |
| Keyboard navigation | Escape to close, Enter/Space on interactive elements, arrow keys in OTP inputs |
| Focus management | Auto-focus on inputs, `tabIndex={0}` on message bubbles |
| Screen reader labels | `aria-label` on all buttons, toggles, and interactive elements |
| Semantic HTML | Hidden decorative elements with `aria-hidden="true"` |

### 10. Developer Tools

| Feature | Detail |
|---------|--------|
| System logs | In-app log viewer with filters (Sent, Received, Info, Error) |
| Storage inspector | IndexedDB usage chart |
| Component demo page | Live demos of panels, toasts, dialogs, form controls |
| API documentation | Swagger UI with Basic auth in production |
| Email template preview | Visual preview of all transactional email templates |
| Docs page | Markdown documentation with Mermaid diagrams and code blocks |

---

## Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **State** | Zustand, TanStack Query, React Context |
| **Real-time** | Socket.IO Client |
| **Offline** | Dexie (IndexedDB), outbound queue with auto-sync |
| **Animations** | Framer Motion |
| **Backend** | Express, TypeScript |
| **Real-time server** | Socket.IO with Redis adapter (multi-instance support) |
| **Database** | PostgreSQL 16 via Prisma ORM |
| **Cache/Pub-Sub** | Redis 7 (presence, rate limits, token blacklist, session data) |
| **AI** | OpenAI GPT-4o-mini (bot replies, conversation summaries) |
| **Email** | Mailtrap (verification, login OTP, password reset) |
| **SMS** | SMS Works API (phone verification, login OTP) |
| **Storage** | AWS S3 (production), local filesystem (development) |
| **Image processing** | Sharp (multi-variant resizing) |
| **Auth** | JWT (7-day), TOTP 2FA (Speakeasy), Redis token blacklist |
| **Deployment** | AWS EC2 + RDS + ElastiCache + S3, PM2 (cluster mode), Nginx |
| **Containers** | Docker Compose (PostgreSQL + Redis for local dev) |
| **Monorepo** | npm workspaces (frontend, backend) |

### Monorepo Structure

```
chatr/
├── frontend/          → Next.js 16 app (React 19)
├── backend/           → Express + Socket.IO server
├── e2e/               → Playwright end-to-end tests
├── widget/            → Built embeddable widget (minified)
├── widget-src/        → Widget source + build system
├── scripts/           → Tooling (cache, hooks)
├── .test-cache/       → Persisted test results (JSON)
├── Documentation/     → Generated docs and test reports
├── playwright.config.ts
├── docker-compose.yml
└── package.json       → Workspace root
```

### Database Schema (Prisma)

| Model | Purpose |
|-------|---------|
| **User** | Auth, profile, privacy settings, 2FA, verification state, guest/bot/support flags |
| **Message** | DM messages with file/audio metadata, reactions, edit history, reply snapshots |
| **MessageEditHistory** | Immutable edit audit log |
| **MessageReaction** | Emoji reactions on messages |
| **GroupMessage** | Group chat messages with file/audio metadata |
| **Group** | Groups with AI-generated summaries |
| **GroupMember** | Membership with roles (owner/admin/member) and status (pending/accepted) |
| **Conversation** | DM conversations with status tracking and AI summaries |
| **Friendship** | Friend requests, accepted friendships, blocks |

### API Surface

The backend exposes **70+ REST endpoints** across 9 route modules:

| Module | Endpoints | Covers |
|--------|-----------|--------|
| Auth | 9 | Register, login, verification, 2FA, logout, password reset |
| Users | 12 | Search, profile, images, settings, username |
| Messages | 5 | History, upload, download, edit history, waveform |
| Groups | 19 | CRUD, members, roles, invites, images, messages |
| Friends | 10 | Requests, accept/decline, block/unblock, search |
| Conversations | 4 | Accept, decline, nuke |
| Widget | 5 | Guest session, history, upload, end chat |
| Dashboard | 6 | Metrics, test results, test runs |
| Other | 3 | Health check, link preview, email preview |

### Real-Time Events (Socket.IO)

**40+ bidirectional events** covering:

| Category | Events |
|----------|--------|
| Connection | `connect`, `socket:ready`, `disconnect`, `reconnect` |
| Presence | `presence:request`, `presence:response`, `user:status` |
| Messaging | `message:send`, `message:received`, `message:edited`, `message:unsent`, `message:react` |
| Typing | `typing:start`, `typing:stop`, `typing:status`, `ghost:typing` |
| Audio | `audio:recording`, `audio:listening`, `audio:listened`, `audio:waveform` |
| Groups | `group:message`, `group:typing`, `group:memberJoined`, `group:memberLeft`, `group:deleted`, `group:invite` |
| Friends | `friend:update`, `friend:notify` |
| Conversations | `conversation:accepted`, `conversation:declined` |

### Infrastructure

```
                   ┌──────────────┐
    Browser ──────►│   Nginx      │
                   │  (reverse    │
    Widget  ──────►│   proxy)     │
                   └──────┬───────┘
                          │
              ┌───────────┼───────────┐
              ▼                       ▼
     ┌────────────────┐    ┌─────────────────┐
     │  Next.js 16    │    │  Express +       │
     │  (port 3000)   │    │  Socket.IO       │
     │  React 19 SSR  │    │  (port 3001)     │
     └────────────────┘    └────────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
             ┌──────────┐   ┌──────────┐    ┌──────────┐
             │PostgreSQL │   │  Redis   │    │  AWS S3  │
             │  16       │   │  7       │    │ (files)  │
             │ (Prisma)  │   │ (pub/sub │    └──────────┘
             └──────────┘   │  presence │
                            │  sessions)│
                            └──────────┘
```

PM2 runs the backend in **cluster mode** (`instances: 'max'`) with the Redis adapter enabling Socket.IO to broadcast across all worker processes.

---

## Testing Strategy

### The Numbers

| Category | Tests | Suites |
|----------|-------|--------|
| Frontend unit tests | **1,475** | 134 files |
| Backend unit tests | **1,133** | 27 files |
| Widget unit tests | **54** | 1 file |
| E2E tests (Playwright) | **85** | 14 spec files × 2 browsers |
| **Total** | **2,700+** | — |

### What's Tested

**Frontend (1,475 tests):** Every form control, every dialog, every panel, every messaging component, every context provider, every custom hook, every page — with full ARIA/accessibility assertions.

**Backend (1,133 tests):** Auth flows, all CRUD operations, socket event handlers, email/SMS services, Redis operations, AI integration, file uploads, the dashboard API, and the summary engine.

**E2E (13 spec files × Desktop Chrome + iPhone 14):**

| Spec | What It Proves |
|------|---------------|
| auth | Login with OTP, unauthenticated redirect, wrong-password handling |
| smoke | Full navigation: chats, friends, groups, settings, profile, search, sign out |
| conversations | Accept/decline requests, send/remove messages, block/unblock |
| messaging | Cross-user messaging (User A sends to User B) |
| dm-messaging | Text, links, images, audio, files, unsend, emoji |
| friends | Search, tabs (Friends/Blocked) |
| groups | Page load, group creation, group list |
| group-management | Create, promote/demote admin, transfer ownership, kick, leave, delete |
| group-messaging | Text, image, voice, file, link — with real-time cross-user visibility |
| group-profile | Edit name, upload/delete avatar and cover image |
| settings | Dark mode toggle, privacy controls |
| profile | Display name, profile image, cover image, gender |
| sockets | 10+ REST endpoint validations (users, friends, groups, conversations) |

**E2E Infrastructure:**
- Dedicated test users (User A + User B) with separate browser contexts
- Global setup: enables test mode, authenticates both users, provisions test assets
- Global teardown: cleans up messages, groups, blocks, restores profiles, disables test mode
- Test assets: `test-image.png`, `test-audio.wav`, `test-file.txt`, `test-cover.png`

### Test Result Caching

Test results persist to `.test-cache/` as JSON, surviving backend restarts, page refreshes, and IDE reloads:

- `.test-cache/frontend.json` — 855 tests, all suites, coverage data
- `.test-cache/backend.json` — ~305 tests, all suites, coverage data
- `.test-cache/e2e.json` — All E2E results with per-browser breakdown

Written automatically by:
- Jest runs (via dashboard API)
- Custom Playwright reporter (`e2e/cache-reporter.ts`)
- Manual export (`npm run test:export`)

---

## The Dashboard

The developer dashboard at `/dashboard` is a **full analytics command centre** for the project. It auto-refreshes every 30 seconds and provides:

### Overview Cards (17+ metrics at a glance)
Total commits, lines of code, source files, test files, E2E tests, API endpoints, components, DB models, dependencies, days active, contributors, commit streak, branches, socket events, TODOs, pages, and bundle size.

### Code Health Gauges
Semicircle gauges showing average file size, backend coverage, frontend coverage, commits per day, and largest file — all colour-coded (green/amber/red).

### Commit Intelligence
- **Commit types**: feat, fix, chore, test, refactor, docs, style — with bar chart and percentages
- **Size analysis**: Average lines/commit, files/commit, churn rate
- **Size distribution**: Histogram of commit sizes (≤10, 11–50, 51–200, 201–500, 500+)
- **Biggest commits**: Top commits ranked by total lines changed

### Weekly Velocity
Bar chart showing insertions (green) and deletions (red) per week — at a glance you see development momentum.

### Security & Build Health
- **Dependency audit**: Critical/high/moderate/low vulnerabilities for frontend and backend
- **Build status**: TypeScript `tsc --noEmit` pass/fail for each area

### Git Activity Visualisations
- **Contribution heatmap**: GitHub-style 52-week heatmap
- **Daily commits**: Bar chart over time
- **Weekly trend**: Aggregated weekly bars
- **Activity by hour**: 24-hour distribution
- **Activity by day**: Day-of-week distribution

### Code Structure Analysis
- **Language breakdown**: TypeScript, CSS, JavaScript, Shell — with donut chart
- **LOC by area**: Frontend vs Backend vs Widget vs Shell — with donut
- **File types**: `.tsx`, `.ts`, `.module.css`, `.css`, `.js`, `.sh` — with donut
- **Architecture inventory**: Components, hooks, contexts, API routes, middleware, utils, pages, DB models, migrations, socket event lines — all enumerated with line counts and badges (has test / has story / has CSS)

### File & Churn Analysis
- **Largest files** by line count
- **Recently modified** files
- **Code churn** (hot files with high change frequency)
- **Stale files** (oldest untouched source files)
- **Code ownership** (author contribution by net lines)

### Test Coverage Matrix
- **Backend**: Tested vs total modules by category (routes, middleware, lib, services, socket)
- **Frontend**: Tested vs total modules by category (components, hooks, contexts, utils, pages)

### Live Test Runner
Run tests directly from the dashboard with **real-time streaming results**:

- **One-click run**: Frontend, backend, or E2E — start from the UI
- **Live feed**: Tests stream in as they complete, with pass/fail icons, duration, and suite grouping
- **Re-run failed**: One button to re-run only the tests that failed
- **Progress bar**: Live summary (completed / total, passed, failed, retrying)
- **Filters**: All, Frontend, Backend, Failed, Chrome, Mobile, Flaky, Retried
- **Coverage display**: Statement, branch, function, and line coverage for each area
- **Cached results**: Results persist to disk — refresh the page and they're still there

### Environment Info
Chatr version, Git SHA, Node.js version, npm version, Git version, Next.js version, Prisma version, TypeScript version, OS — all displayed in the footer.

---

## What Makes This Impressive

1. **Solo-built, production-grade** — One developer built the entire stack: frontend, backend, real-time, AI, widget, deployment, testing, and tooling.

2. **2,700+ automated tests** — Not just unit tests. Full E2E flows across desktop and mobile browsers with proper setup/teardown, test isolation, and result caching.

3. **Real-time everything** — WebSockets with Redis adapter for multi-instance support. Presence, typing, ghost typing, reactions, read receipts — all live.

4. **Embeddable widget** — A drop-in `<script>` tag that adds live chat to any website. Built in vanilla JS, no dependencies, fully customisable.

5. **AI integration** — GPT-4o-mini powers the Luna bot and auto-generates conversation summaries for DMs and groups.

6. **Developer dashboard** — Not just metrics. A full command centre with live test streaming, commit intelligence, security audits, architecture analysis, and code health gauges.

7. **Offline-first** — IndexedDB caching, outbound message queue, automatic sync on reconnect. The app works without a connection.

8. **Accessibility** — ARIA roles, live regions, keyboard navigation, focus management, screen reader labels — throughout every component.

9. **Production deployment** — AWS (EC2 + RDS + ElastiCache + S3), PM2 cluster mode, Nginx reverse proxy, Docker Compose for local dev.

10. **Mobile-first** — Responsive design, safe area insets, bottom navigation, slide-up sheets, touch-friendly interactions.

---

## Quick Reference

| Metric | Value |
|--------|-------|
| Total automated tests | **2,700+** |
| E2E browser coverage | Desktop Chrome + iPhone 14 |
| REST API endpoints | **85+** |
| Socket.IO events | **100+** |
| Frontend components | **60+** |
| Custom hooks | **15+** |
| React contexts | **9** |
| Database models | **9** (Prisma/PostgreSQL) |
| Authentication methods | Email + SMS + TOTP 2FA |
| Supported file types | Images, video, audio, PDF, documents, archives |
| Max upload size | 50MB |
| Deployment | AWS (EC2, RDS, ElastiCache, S3) |
| Process management | PM2 cluster mode |
