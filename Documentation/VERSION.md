# Changelog

All notable changes to Chatr are documented here. New entries are auto-generated on each commit by the post-commit hook and can be expanded with detail afterwards. Version numbers correspond to the auto-incremented build counter in `frontend/src/version.ts`.

---

## v0.1.25 — 2026-03-23

**Commit:** `6c3a2a0` — fix: add missing getApiBase() calls in image service functions

---

## v0.1.24 — 2026-03-23

**Commit:** `a360001` — feat: add WebRTC P2P voice calling with HTTPS dev setup

- WebRTC 1-to-1 voice calls with Socket.IO signaling and full-screen call overlay
- HTTPS dev environment using mkcert for iOS microphone access (getUserMedia)
- Backend serves HTTP:3001 (internal proxy) + HTTPS:3002 (browser connections)
- Dynamic API URL resolution via getApiBase() for LAN/remote device testing
- Asset URL normalization to relative paths, fixing mixed-content and cross-device issues
- iOS PWA safe area insets for SiteNav, BottomNav, toasts, and panel headers
- Case-insensitive login with autoCapitalize disabled for mobile keyboards
- CallProvider decoupled from WebSocketContext via CallSocketBridge to prevent Chrome flickering
- Documentation for voice calls, socket events, database model, and frontend context

---

## v0.1.23 — 2026-03-23

**Commit:** `6d6d32d` — fix: disable runtime image optimization in production to prevent broken screenshots

---

## v0.1.22 — 2026-03-23

**Commit:** `49488b9` — fix: use sudo for SSL cert detection during maintenance mode

---

## v0.1.21 — 2026-03-23

**Commit:** `ca83a5a` — fix: preserve SSL certs during maintenance mode, fix Storybook 500

- Maintenance Nginx config now detects and reuses existing Let's Encrypt
  certs instead of always using a self-signed fallback
- Fix Storybook Nginx location: replace broken try_files fallback with
  explicit index directive and =404 (alias + try_files gotcha)

---

## v0.1.20 — 2026-03-23

**Commit:** `b9f4c79` — feat: add maintenance page for deploys and background blobs to site pages

- Add self-contained maintenance.html with inline base64 logo/favicon,
  animated progress bar, and auto-refresh when site comes back
- Wire maintenance mode into aws.sh and deployAWS.sh — Nginx swaps to
  the maintenance page before build, restores real config after deploy
- Add animated BackgroundBlobs to all public site pages via SiteNav
- Skip-to-content link fix: use clip-rect sr-only pattern instead of
  top offset to prevent flash of visibility

---

## v0.1.19 — 2026-03-23

**Commit:** `bdfbbea` — feat: comprehensive accessibility (WCAG 2.1 AA) and SEO audit fixes

- Remove viewport zoom restriction (userScalable, maximumScale)
- Add skip-to-content link with sr-only/focus-visible pattern
- Associate contact form labels with inputs (htmlFor/id/autoComplete)
- Convert product sidebar <a> tags to keyboard-focusable <button> elements
- Add <main id="main-content"> landmark to all 8 public pages
- Add aria-labels to hamburger, sidebar toggle, and back-to-top buttons
- Add table captions (sr-only) and scope="col" to comparison/pricing tables
- Add role="alert" and role="status" to contact form feedback states
- Add focus-visible outline styles for all interactive elements
- Add aria-hidden="true" to 150+ decorative Font Awesome icons
- Add aria-expanded to dropdown, hamburger, and sidebar toggles
- Add aria-current="page" to active nav links
- Add Escape key handler to close dropdown, mobile menu, and product sidebar
- Add sr-only Yes/No text for comparison table check/cross icons
- Define --text-tertiary globally for WCAG-compliant contrast
- Increase mobile nav touch targets to 44px minimum
- Add aria-hidden to decorative heroGradient divs
- Add role="menu" and role="menuitem" to dropdown menus
- Diversify OG images per page (was all using same screenshot)
- Use static lastModified dates in sitemap instead of new Date()
- Remove self-rated aggregateRating from JSON-LD (manual action risk)
- Add JSON-LD WebPage structured data to features and product pages
- Add <noscript> fallback message to root layout
- Fix footer heading hierarchy (h3 → h2)

---

## v0.1.18 — 2026-03-23

**Commit:** `67150e9` — docs: replace infrastructure ASCII art with Mermaid graph, fix auto-deploy references

- Replace ASCII infrastructure diagram with Mermaid graph in PRESENTATION.md
- Correct docs to state deployment is manual via bash aws.sh (no auto-deploy)
- Remove false auto-deploy claim from technology page

---

## v0.1.17 — 2026-03-23

**Commit:** `9b893c0` — fix: Storybook stories and image cropper scaling/theming

- Fix next/navigation mocks for Storybook (usePathname, useRouter)
- Add missing context providers to story decorators (Friends, WebSocket, Toast, etc.)
- Fix image cropper scaling: use full container size instead of 90% inset
- Add themed borders and overlays to profile/cover image croppers
- Use createPortal for cropper modals to escape parent transforms
- Add canvas-generated test images for cropper stories
- New Storybook stories for multiple components
- Documentation restructure and backend route updates

---

## v0.1.16 — 2026-03-22

**Commit:** `d57f005` — fix: docs footer overlap, remove version from docs home, add back-to-top button

- Replace full SiteFooter with minimal inline footer on docs page
- Remove VERSION.md auto-load on docs home screen (quick links only)
- Add global BackToTop floating button on all pages (appears after 400px scroll)

---

## v0.1.15 — 2026-03-22

**Commit:** `47d1f81` — fix: hide E2E panel on production, remove auto-deploy from post-commit

---

## v0.1.14 — 2026-03-22

**Commit:** `9818cbc` — fix: password dialog z-index above panel overlay on dashboard

---

## v0.1.13 — 2026-03-22

**Commit:** `dc906fc` — fix: use TLS (rediss://) for ElastiCache Redis connection

---

## v0.1.12 — 2026-03-22

**Commit:** `644922c` — fix: remove hardcoded secrets from deploy scripts and production code

- Remove personal email defaults from deployAWS.sh and seed scripts
- Add Mailtrap/SMS env vars to deploy pipeline so production emails work
- Update .env.deploy.example with all available configuration options
- Add comprehensive "Deploying to AWS" section to GETTING_STARTED.md
- Fix Nginx config: www→non-www redirect, Nginx-level CORS for API

---

## v0.1.11 — 2026-03-22

**Commit:** `111b606` — feat: add paid support packages at £15/hr with tiered monthly plans

---

## v0.1.10 — 2026-03-22

**Commit:** `fc92a82` — feat: expand site with commercial, developer, and acquisition content

---

## v0.1.9 — 2026-03-22

**Commit:** `bd16bd3` — chore: update site stats to reflect current project metrics

---

## v0.1.8 — 2026-03-22

**Commit:** `b81532c` — feat: open source deployment pipeline and getting started guide

- Add GETTING_STARTED.md with full setup guide (Mailtrap, SMS Works,
  OpenAI, AWS S3) and deployment instructions
- Extract all secrets from aws.sh and deployAWS.sh into .env.deploy
  (gitignored) so deploy scripts are safe to ship in the repo
- Add .env.deploy.example documenting every deployment variable
- Expand backend/.env.example with all optional service keys
- Add SiteFooter to docs page
- Add auto-deploy to AWS on commit via post-commit hook
- Un-gitignore aws.sh and deployAWS.sh for open source users

---

## v0.1.7 — 2026-03-22

**Commit:** `80dfe7e` — feat: rebrand as open source with MIT license and GitHub CTAs

- Add MIT LICENSE file to indicate open source status.
- Replace commercial CTAs with GitHub links across all site pages.
- Update site content to reflect open source nature and community support.
- Enhance SEO metadata and JSON-LD schema for better visibility.

---

## v0.1.6 — 2026-03-22

**Commit:** `11495b5` — feat: redesign dashboard with summary cards, test stat cards & mini bar charts

- Redesign dashboard to include SummaryCard, TestStatCard, and MiniBar components.  
- Enhance metrics display with click-to-drill-down functionality for better user interaction.  
- Improve overall dashboard layout and usability through a major overhaul.  
- Update tests to accommodate new dashboard components and functionality.

---

## v0.1.5 — 2026-03-21

**Commit:** `0d6e02e` — fix: deduplicate changelog entry and add the joke we earned

---

## v0.1.4 — 2026-03-21

**Commit:** `743e820` — fix: correct version numbering from v0.1.0 onwards

> Who needs semantic versioning when you can have chaotic versioning?
> We went from 0.0.155 straight to 0.1.2 like a lift that skips floors.
> This commit restores order to the multiverse.

- Add missing v0.1.0 changelog entry for the minor version bump
- Renumber v0.1.2→v0.1.1, v0.1.3→v0.1.2, v0.1.4→v0.1.3
- Sync version.ts and package.json files to 0.1.3

---

## v0.1.3 — 2026-03-21

**Commit:** `ced84d0` — feat: extract reusable Pagination component with smooth carousel animation

- Extract pagination into reusable component at components/Pagination
- Render all page numbers in a continuous strip with CSS translateX sliding
- Buttery smooth carousel animation using cubic-bezier(0.22, 1, 0.36, 1)
- Edge fade masks driven by actual track scroll position, not page number
- Remove left fade when first page is in view, right fade when last page is
- Remove old inline pagination markup and CSS from docs page

---

## v0.1.2 — 2026-03-21

**Commit:** `3de5de0` — fix: backfill changelog from commit bodies and prefer them over Luna summaries

- Retrofix 23 VERSION.md entries with full bullet points from git commit bodies
- Add missing v0.0.152 entry
- update-changelog.js now uses commit body bullets directly when available
- Luna AI fallback only used for sparse commit messages

---

## v0.1.1 — 2026-03-21

**Commit:** `c8837a0` — fix: persist test mode in Redis and harden E2E test reliability

- Persist test mode flag in Redis so it survives backend restarts
  (tsx watch), preventing rate limiter from blocking auth mid-run
- Restore test mode on backend startup via restoreTestMode()
- Increase keepAliveTimeout/headersTimeout to prevent ECONNRESET
- Wrap E2E API helpers with retry-on-transient-error logic
- Fix stale React closure in InlineField save using latestText ref
- Remove counterproductive 10s fetch timeout in profile updateMe
- Add reload fallback for stale group list cache in E2E tests
- Improve messaging test with click retry loop and longer WS timeout
- Add API fallback for group promote test under heavy load
- Increase profile save assertion timeouts from 10s to 20s
- Add null guard for spawn in dashboard E2E runner
- Update unit tests for async setTestMode and proper spawn mocking

---

## v0.1.0 — 2026-03-21

**Commit:** `cacefc8` — chore: bump version to 0.1.0

- First minor version bump marking stable E2E test suite (168/168 passing)

---

## v0.0.155 — 2026-03-21

**Commit:** `74e84c5` — chore: extend JWT token expiry from 7 days to 1 year

---

## v0.0.154 — 2026-03-21

**Commit:** `73fdd6a` — feat: add split-screen demo recorder, reliability improvements & teardown fixes

- Add demo/record-demo.ts: Playwright script recording a side-by-side
  video (Carl + Simon) showcasing all features with chapter title cards
- Add post-commit hook to trigger demo recording in background when
  dev servers are running (non-blocking, gitignored output)
- Backend warmup: explicit Prisma $connect() + Redis ping at startup
  to eliminate cold-start latency on first requests
- Profile save indicators: inline Saving.../Saved/Error feedback on
  MyProfilePanel fields with data-save-status attributes for E2E
- File upload loading state: pulsing spinner in MessageInput while
  FileReader processes image thumbnails
- Fix teardown to restore profileImage/coverImage fields (were being
  cleared without restoration after E2E profile image tests)
- Update E2E profile + group-messaging tests to use deterministic
  save-status attributes and file-preview-strip locators
- Clean up stale files (upload, user, docx)

---

## v0.0.153 — 2026-03-20

**Commit:** `2afbc39` — fix: resolve E2E test flakiness and recover 4 missing tests

- Fix registration test OTP filling: click each input before typing to
  handle unreliable auto-focus across browsers
- Fix registration post-verification flow with Promise.race for variable
  API response times between email and phone verification
- Wait for username availability check icon instead of fragile timeouts
- Fix group-profile upload tests: replace non-existent "Group info" button
  with correct .auth-panel-title click to open group profile panel
- Switch mobile project from WebKit to Chromium for reliable React input
  handling in Playwright
- Enable trace: 'retain-on-failure' for easier failure debugging
- Add Chrome/Mobile project tags to dashboard test results UI
- Improve dev.sh cleanup to kill all child processes on exit
- Fix parsePlaywrightLine return type to include isTeardown property

---

## v0.0.152 — 2026-03-19

**Commit:** `8d96ebc` — fix: E2E test reliability + dashboard live progress

- Fix crash recovery to not kill orphaned Playwright processes
- Add RunningBanner with live elapsed timer for E2E runs
- Grace period prevents stale 'ready' responses from killing running state
- Fix gender select: controlled component with save guard
- Fix upload tests: data-testid on cropper Upload buttons
- Fix auth/registration tests: hamburger menu fallback for mobile
- Fix registration: remove phoneNumber to avoid phone verification blocker
- Fix group-management: scoped confirmation dialog selector
- Remove 50% guard from cache-reporter and saveTestReport

---

## v0.0.151 — 2026-03-19

**Commit:** `f48e96d` — feat: docs light mode, settings to burger menu, compact theme toggle, Luna changelog, full version history

- Add light mode documentation to improve user guidance on theme options.
- Move settings to the burger menu for easier access and navigation.
- Introduce a compact theme toggle for enhanced user customization.
- Update the changelog to include full version history for better tracking of changes.

---

## v0.0.150 — 2026-03-19

**Commit:** `6720fd4` — docs: add changelog, update docs for auth panel, profile, E2E, and socketFirst changes

- Create Documentation/Versions/CHANGELOG.md with full version history
- Update main index with changelog link and recent additions
- Update AuthPanel docs for panel-based auth flow (no dedicated routes)
- Update Authentication docs for email-first verification and AuthPanel integration
- Update Routes docs with test cleanup endpoints and contact route
- Update Testing docs with comprehensive E2E test section and Playwright details
- Update Architecture diagram with contact and test-cleanup routes
- Update Frontend index to remove 2FA from settings description
- Add socketRPC and messageCache docs to Frontend Lib index

---

## v0.0.149 — 2026-03-14

**Commit:** `7f6c98c` — feat: auth panel, profile management, E2E tests, and socketFirst reliability

- Replace dedicated auth routes with slide-in AuthPanel from SiteNav avatar dropdown
- Remove Demo2FA component and all references
- Add avatar dropdown with auth and app navigation options
- Add Back to Web link in app burger menu
- Fix socketFirst timeout cascade by gating contexts and hooks on connected state
- Profile panel uses direct HTTP for reliable fetch and save with status indicators
- Profile fetches fresh data from server on every view for multi-device support
- Increase dashboard cache TTL from 60s to 5min to reduce event loop blocking
- Add E2E registration tests for API and browser UI panel flow
- Rewrite profile E2E tests for display name, names, gender, avatar, cover image
- Add test user deletion endpoint and API helpers for E2E cleanup
- Configure next.config.js image remotePatterns for localhost and AWS
- Remove homepage auto-redirect to app for logged-in users
- Footer Create Account opens AuthPanel via custom event
- Fix unit tests for new auth flow and connected state guards

---

## v0.0.148 — 2026-03-12

**Commit:** `b367f7a` — feat: expand test coverage, harden dashboard test runner, add stale results nag

- Massively expand backend + frontend test suites (~13.6k lines added)
- Add null guards to dashboard child process callbacks to prevent crash on server restart
- Prevent dashboard unit tests from overwriting real .test-cache files (backup/restore)
- Add stale test results indicator (4h threshold) for unit and E2E sections
- Fix minor bugs in groups, link-preview, messages routes found during testing
- Add jest-results.json to gitignore

---

## v0.0.147 — 2026-03-11

**Commit:** `1efe606` — Fix TypeScript error: pendingAction callback accepts password arg

- Fixed TypeScript compilation error in authentication flow

---

## v0.0.146 — 2026-03-11

**Commit:** `cb85a65` — feat: password-protect dashboard test runner in production

- Added password protection to the dashboard test runner for production environments

---

## v0.0.145 — 2026-03-10

**Commit:** `2d0f0cf` — feat: enhanced SEO, contact DB storage, FAQ structured data

- Enhanced SEO across marketing pages
- Contact form submissions now stored in database
- Added FAQ structured data for search engines

---

## v0.0.144 — 2026-03-09

**Commit:** `dc054bb` — fix: use raw SQL in seed-support-user to avoid schema drift errors

- Fixed database seeding to use raw SQL instead of Prisma client to avoid schema drift issues

---

## v0.0.143 — 2026-03-08

**Commit:** `3f9447a` — feat: contact page, CTAs, SEO, metrics update, and layout fixes

- Added contact page with form
- Improved call-to-action elements across the site
- SEO improvements and layout fixes
- Updated dashboard metrics

---

## v0.0.142 — 2026-03-07

**Commit:** `b7b5337` — feat: marketing website, scrolling fix, SiteNav across all pages, GBP pricing

- Build commercial marketing website with Home, Features, Widget, Pricing, Technology pages
- Add shared SiteNav (with logo) and SiteFooter components across all public pages
- Add SiteNav to product overview, documentation, and dashboard pages
- Fix scroll-wheel/trackpad not working (overscroll-behavior-y: contain blocking scroll chaining)
- Change all pricing from $ to £ across the site
- Remove "Open App" button from nav (redirects to home when not logged in)
- Add prominent logo to home page hero and nav bar
- Add public screenshots directory for web-accessible images
- Update screenshot script and DOCX generation with improved layout

---

## v0.0.141 — 2026-03-06

**Commit:** `3dd59ac` — fix: build error, dependency vulnerabilities, and widget auth; add presentation assets

- Fix TypeScript build error in dashboard SuiteRow (unknown[] map type)
- Fix FriendsContext firing API calls without auth token on public pages
- Update file-type, flatted, undici to resolve 3 security advisories (0 vulns)
- Add product overview .docx with embedded screenshots and generation scripts
- Add Playwright screenshot capture script for automated visual assets

---

## v0.0.140 — 2026-03-05

**Commit:** `a01f0ab` — E2E

- Initial E2E test suite

---

## v0.0.139 — 2026-03-04

**Commit:** `5c6533d` — feat: E2E test suite, real-time dashboard streaming, and test mode infrastructure

- Add full Playwright E2E test suite (auth, conversations, DMs, groups, profiles, settings, friends)
- Dashboard: real-time test result streaming with live progress for both unit and E2E tests
- Dashboard: grouped-by-file collapsible E2E results with chromium/mobile project badges
- Dashboard: unified FE/BE unit test view with area labels, auto-load cached results on mount
- Dashboard: retry/flaky detection with visual badges (amber for flaky, red for failed retries)
- Dashboard: 4-wide stat card layout with consistent sizing
- Add runtime test mode toggle to suppress SMS/email during E2E runs
- Add test cleanup endpoints and prisma connection pooling
- Add socket RPC handlers and frontend socketRPC client
- Fix test setup to mock shared prisma module
- AWS deployment docs, ecosystem PM2 config, docker-compose updates

---

## v0.0.138 — 2026-03-12

**Commit:** `4caeae3` — feat: socket-first conversations, tiered privacy, link previews, profile page

- Introduced `socketFirst` utility — attempts WebSocket RPC first, falls back to REST
- Tiered privacy settings for online status and profile visibility
- Link preview generation for shared URLs in messages
- Profile page with editable fields

---

## v0.0.137 — 2026-03-12

**Commit:** `adcde1b` — feat: responsive image variants, typing indicators on chat list, and image loading fixes

- Add responsive image pipeline: backend generates sm/md/full JPEG variants
  on upload (sharp), frontend selects the right size per context (imageUrl helper)
- Add migration script to post-process existing images to optimized JPEGs
- Show typing indicator on chat list: animated dot bubble for DMs and groups
  with first-name display ("Simon is typing")
- Fix stale IndexedDB image URLs after migration by reconciling extensions
- Add onError fallbacks and localStorage sync for profile/cover images
- Improve GroupProfilePanel: initialGroup prop for instant render, socket-based
  real-time sync, skeleton loaders for images
- Fix GroupProfilePanel tests for retry logic and bottom-sheet member actions

---

## v0.0.136 — 2026-03-12

**Commit:** `093063e` — feat: improve group member management and fix summary engine performance

- Split group member list into separate Owner/Admin/Member sections sorted alphabetically
- Add confirmation dialogs for promoting and demoting admins
- Add stacked Add Members panel for inviting users to groups
- Fix search list re-fetching on each user selection in NewGroupPanel and AddGroupMembersPanel
- Queue summary regeneration tasks sequentially to prevent event loop saturation

---

## v0.0.135 — 2026-03-12

**Commit:** `d87db02` — test: add summaryEngine test coverage for 100% backend module coverage

- Added comprehensive tests for the AI conversation summary engine
- Achieved 100% backend module test coverage

---

## v0.0.134 — 2026-03-12

**Commit:** `2d47b98` — fix: lazy-import music-metadata and reduce bcrypt cost in auth tests

- Use dynamic import() for music-metadata to avoid ESM resolution
  issues on server where npm 10 hoists packages differently
- Reduce bcrypt hash rounds from 10 to 1 in auth tests to prevent
  socket hang up from slow CPU-bound operations during test runs

---

## v0.0.133 — 2026-03-12

**Commit:** `2526f0f` — fix: ignore node_modules in tsx watch to prevent restart storms

- Fixed tsx watch configuration to ignore `node_modules` directory

---

## v0.0.132 — 2026-03-12

**Commit:** `100f27e` — fix: remove nested package-lock.json files causing workspace install failures

- Cleaned up nested `package-lock.json` files that broke npm workspace installs

---

## v0.0.131 — 2026-03-12

**Commit:** `d15c5dd` — feat: offline message queuing, local cache hydration, and syncing UI

- Queue DM and group text messages to IndexedDB when offline, flush on reconnect
- Load cached conversations, groups, and friends from localStorage on startup
- Add syncing banner while background fetch is in progress
- Add AbortController to all frontend fetches to prevent "Load failed" errors
- Fix Next.js 16 ssr:false error by using direct client component import
- Guard localStorage reads for SSR safety
- Show pending group members in GroupProfilePanel
- Optimize backend conversation queries with DISTINCT ON and Promise.all
- Add message composite indexes migration

---

## v0.0.130 — 2026-03-12

**Commit:** `1a306a7` — fix: match Read more fade and button gradient to bot/guest bubble colors

- Fixed "Read more" fade overlay and button gradient to match bot and guest message bubble colours

---

## v0.0.129 — 2026-03-12

**Commit:** `0effea5` — feat: add AI conversation summaries with ticker wheel animation

- Luna AI generates conversation summaries from recent messages
- Animated ticker wheel UI while summary is loading
- Summaries shown in conversation list below last message preview

---

## v0.0.128 — 2026-03-11

**Commit:** `f298e8d` — test: add GroupProfilePanel test coverage

- Added unit tests for the GroupProfilePanel component

---

## v0.0.127 — 2026-03-11

**Commit:** `dad0896` — feat: add group profile page with cover/avatar images, name editing, and member management

- Add profileImage and coverImage fields to Group model with migration
- Add backend routes for group image upload/delete (admin-only)
- Create GroupProfilePanel with hero section matching user profile style
- Support inline group name editing with zero layout shift
- Show member list with roles (owner/admin/member) and admin actions
- Make group and message avatars clickable to open user profiles
- Add updatePanelMeta to PanelContext for real-time title updates
- Ensure consistent 1px avatar borders across all panel title bars

---

## v0.0.126 — 2026-03-11

**Commit:** `8748db8` — feat: add vulnerability details, JSDoc for all endpoints, and clean-state indicators

- Show per-package vulnerability details in dependency security section
- Add tooltips to all truncated text across dashboard
- Document all dashboard route endpoints with JSDoc
- Fix API doc scanner to handle long JSDoc blocks (up to 60 lines)
- Add tick/empty-state messages for clean sections (deps, build, docs, migrations)

---

## v0.0.125 — 2026-03-11

**Commit:** `247da61` — test: add comprehensive frontend and backend test coverage

- Add tests for all 12 hooks, 9 contexts, 2 utils, and 8 pages
- Add backend tests for conversations, dashboard, email, friends, etc.
- Include updated coverage reports
- Remove obsolete images.test.ts, update test setup

---

## v0.0.124 — 2026-03-11

**Commit:** `e3a44c5` — feat: add commit size graph, shell script support in language metrics, and UI polish

- Add per-commit insertions/deletions data with log-scale SVG line graph (last 50, excluding version bumps)
- Include .sh files in language breakdown, LOC by area, and file types
- Match Activity by Hour and Activity by Day chart heights and widths

---

## v0.0.123 — 2026-03-11

**Commit:** `efc9408` — fix: include __tests__ dirs in test file counts for dashboard

- Dashboard test file counter now includes `__tests__` directories

---

## v0.0.122 — 2026-03-11

**Commit:** `c90fa4b` — fix: exclude version.ts from code churn statistics

- Excluded auto-incremented `version.ts` from code churn metrics

---

## v0.0.121 — 2026-03-11

**Commit:** `fe743ad` — test: add SettingsPanel tests, empty states for all dashboard sections

- Added SettingsPanel unit tests
- Dashboard sections now show empty/clean-state messages

---

## v0.0.120 — 2026-03-11

**Commit:** `1b5518d` — test: add tests for all 23 untested components

- Added unit tests for 23 previously untested frontend components

---

## v0.0.119 — 2026-03-11

**Commit:** `b4f1fb8` — docs: refresh all documentation for recent features

- Updated all documentation to reflect widget, video messaging, and deployment changes

---

## v0.0.118 — 2026-03-11

**Commit:** `9cd03cd` — fix: components scrollbox to fill card height using absolute positioning

- Fixed dashboard components scrollbox layout

---

## v0.0.117 — 2026-03-11

**Commit:** `0bef745` — revert: components box to standard scrollbox with fixed max height

- Reverted scrollbox approach to standard fixed max-height

---

## v0.0.116 — 2026-03-11

**Commit:** `19ae7d0` — fix: components box to fill grid cell height with scrolling content

- Dashboard components box now fills available grid cell height

---

## v0.0.115 — 2026-03-11

**Commit:** `4c4127f` — fix: components scrollbox — constrain height with scroll, remove fill hack

- Fixed scrollbox height constraints

---

## v0.0.114 — 2026-03-11

**Commit:** `2bb825a` — feat: add dashboard metrics — code churn, commit streak, lines changed, stale files, code ownership, bundle size, branches/tags, untested components, prisma complexity

- Added 9 new dashboard metrics: code churn, commit streak, lines changed, stale files, code ownership, bundle size, branches/tags count, untested components, and Prisma schema complexity

---

## v0.0.113 — 2026-03-11

**Commit:** `326b862` — make components scrollbox fill its grid cell height

- Dashboard components scrollbox fills grid cell height

---

## v0.0.112 — 2026-03-11

**Commit:** `60181c4` — show short SHA in recent commits on dashboard

- Recent commits section now shows abbreviated commit hashes

---

## v0.0.111 — 2026-03-11

**Commit:** `b5702d1` — add caption text support for image and video uploads

- Users can now add captions when sending image and video messages

---

## v0.0.110 — 2026-03-11

**Commit:** `9ac03f5` — format all dashboard dates as dd/mm/yy

- Standardised all dashboard date displays to UK format

---

## v0.0.109 — 2026-03-11

**Commit:** `989153d` — fold version bump into commits and add SHA to dashboard env

- Version bump now folded into the commit via post-commit hook amend
- Dashboard environment section shows current git SHA

---

## v0.0.108 — 2026-03-11

**Commit:** `bbeef51` — add app version to dashboard environment section

- Dashboard now displays the current app version

---

## v0.0.107 — 2026-03-11

**Commit:** `2d6e5af` — remove persistent bot/guest borders from conversation list

- Removed always-visible coloured borders from bot and guest conversation list items

---

## v0.0.106 — 2026-03-11

**Commit:** `f3b61bb` — move health gauge label above arc and value below

- Dashboard health gauge label repositioned above the arc

---

## v0.0.105 — 2026-03-11

**Commit:** `7fcb860` — refactor: extract component CSS from globals.css into CSS modules

- DatePicker.module.css (328 lines, scoped)
- Hero.module.css (181 lines, scoped)
- ToastContainer.module.css (147 lines, scoped)
- Docs.module.css (145 lines, scoped)
- BackgroundBlobs.module.css (51 lines, scoped)
- ConfirmationDialog.module.css (18 lines, merged)
- AuthPanel.module.css (66 lines, :global)
- Logo.module.css (17 lines, :global)

---

## v0.0.104 — 2026-03-11

**Commit:** `404472d` — fix: dashboard grid columns stretching unevenly due to long content

- Fixed dashboard grid layout issue with long content

---

## v0.0.103 — 2026-03-11

**Commit:** `b0660ad` — show TODOs & FIXMEs section even when empty with a clean-slate message

- Dashboard TODOs/FIXMEs section shows a "clean slate" message when empty

---

## v0.0.102 — 2026-03-11

**Commit:** `4a910b0` — implement resend verification code for email and login flows

- Added "Resend code" button for email and login verification flows

---

## v0.0.101 — 2026-03-11

**Commit:** `985bf40` — remove old/backup files

- Cleaned up old handler backups and demo `.bak` files

---

## v0.0.100 — 2026-03-11

**Commit:** `d50240d` — expand TODOs/FIXMEs and Recent Commits sections by default

- Dashboard TODOs and Recent Commits sections now expanded by default

---

## v0.0.99 — 2026-03-11

**Commit:** `4855379` — replace dashboard emojis with Font Awesome duotone icons

- Replaced all emoji icons on the dashboard with Font Awesome duotone icons

---

## v0.0.98 — 2026-03-11

**Commit:** `d785d0a` — fix: dashboard mobile — shrink list rows, hide badges, normalise font sizes

- Made dashboard responsive for mobile viewports

---

## v0.0.97 — 2026-03-11

**Commit:** `0f31b7b` — make dashboard responsive for mobile, fix flaky backend test

- Dashboard mobile responsiveness improvements
- Fixed flaky backend test

---

## v0.0.96 — 2026-03-10

**Commit:** `7119656` — docs: comprehensive update — widget, video, deployment, README

- Create Documentation/Widget/index.md covering embedding, config,
  build pipeline, icon system, API routes, session lifecycle, testing
- Add video message type across FILE_UPLOAD, MESSAGING, REST_API,
  EVENTS, MessageBubble, and MessageInput docs
- Document collapsible text ("Read more") feature
- Update file upload limit from 10MB to 50MB everywhere
- Update deployment docs for SSH-based local execution flow and 55M
  Nginx client_max_body_size
- Add useGroupMessageInput to hooks and architecture docs
- Add widget test section to Testing docs
- Rewrite README.md with correct links, test counts, and widget info
- Fix "chatrr" typos in DEPLOY_AWS.md

---

## v0.0.95 — 2026-03-10

**Commit:** `62c5384` — fix: load mermaid from CDN, add widget tests, resolve vulnerabilities

- Replace npm mermaid with CDN import to fix Turbopack bare specifier
  error in Next.js 16, removing 124 packages from the dependency tree
- Add 54 widget tests (pure functions + build pipeline) wired into
  npm run test:widget and the root npm test command
- Rebuild minified widget output with current REPLACE_MAP
- 0 npm audit vulnerabilities across all workspaces

---

## v0.0.94 — 2026-03-10

**Commit:** `3bed90b` — feat: video messages, code blocks, read more, widget build pipeline

- Add video message support across app and widget (upload, preview, playback)
- Fix code block rendering for single-line fenced blocks
- Add collapsible "Read more" for long text messages with animated expand/collapse
- Standardise message bubble padding and scroll-to-bottom behaviour
- Move widget source to widget-src/, build minified widget/chatr.js via Terser
- Add widget build watcher to dev.sh
- Optimise widget output: CSS class/ID shortening, CSS var compression,
  DOM method aliases, theme deduplication (44kB → 38kB, 50.5% reduction)
- Widget: hide input scrollbar, disable send button when empty
- Use dynamic API_URL in widget demo embed snippet

---

## v0.0.93 — 2026-03-09

**Commit:** `34da9c3` — fix: widget open/closed state persisted in localStorage

- Widget remembers whether it was open or closed across page refreshes

---

## v0.0.92 — 2026-03-09

**Commit:** `5874144` — fix: widget session always persists — remove localhost DEV_MODE detection

- Widget sessions now always persist via localStorage
- Removed automatic dev mode detection that cleared sessions on localhost

---

## v0.0.91 — 2026-03-09

**Commit:** `f5aa818` — fix: widget session persists 24h across refreshes — add history endpoint

- Widget chat sessions persist for 24 hours
- Added message history endpoint for session resume

---

## v0.0.90 — 2026-03-09

**Commit:** `e27424f` — fix: widget shows first name only, Away instead of Unavailable

- Widget displays agent first name only
- Status shows "Away" instead of "Unavailable"

---

## v0.0.89 — 2026-03-09

**Commit:** `5aff6da` — feat: widget shows first names only and friendlier copy

- Widget copy updated to be more conversational and friendly

---

## v0.0.88 — 2026-03-09

**Commit:** `5100bb3` — fix: add missing End Chat button to widget panel HTML

- Added End Chat button to widget UI

---

## v0.0.87 — 2026-03-09

**Commit:** `fe535b3` — feat: allow adding guests as friends; exclude guests/bots from searches

- Guests can be added as friends from conversation panel
- Guests and bots excluded from user/friend search results

---

## v0.0.86 — 2026-03-09

**Commit:** `6707e2c` — fix: chat view avatar initials show orange gradient background

- Fixed invisible avatar initials by adding orange gradient background

---

## v0.0.85 — 2026-03-09

**Commit:** `14dcc05` — fix: guest avatar green gradient ring and background in chat panel

- Guest avatars now display green gradient ring consistently
- Fixed PresenceAvatar ring rendering when no profile image exists

---

## v0.0.84 — 2026-03-09

**Commit:** `437ae14` — feat: guest user green styling in conversation list and message bubbles

- Guest users have distinct green styling in conversation list and message bubbles

---

## v0.0.83 — 2026-03-09

**Commit:** `81cd1ef` — fix: widget typing indicator — listen for typing:status event

- Fixed widget to listen for `typing:status` event instead of `typing:start/stop`
- Fixed agent-to-guest typing indicator in pending conversations

---

## v0.0.82 — 2026-03-08

**Commit:** `ca7ddc0` — fix: wait for socket:ready before sending first widget message

- Widget now waits for server `socket:ready` event before sending messages
- Prevents first message being silently dropped due to race condition

---

## v0.0.81 — 2026-03-08

**Commit:** `1ca041f` — fix: widget dev mode, localStorage for production session persistence

- Dev mode clears session on each page load for testing
- Production mode persists sessions in localStorage

---

## v0.0.80 — 2026-03-08

**Commit:** `1afdd16` — fix: always emit message:received to Socket.IO room regardless of Redis state

- Fixed messages not being delivered when Redis is disconnected
- Socket.IO rooms used for delivery instead of Redis socket ID lookup

---

## v0.0.79 — 2026-03-08

**Commit:** `ddafbeb` — fix: widget avatar URL, message bubble avatar, typing indicator with avatar

- Fixed widget avatar rendering and typing indicator display

---

## v0.0.78 — 2026-03-08

**Commit:** `b12689b` — fix: widget demo at localhost:3000/widget/demo.html via Next.js rewrite

- Added Next.js rewrite rule so widget demo works at `/widget/demo.html`

---

## v0.0.77 — 2026-03-08

**Commit:** `9fd3730` — fix: widget auto-detects API URL from script src

- Widget automatically detects backend API URL from its own `<script>` tag `src` attribute

---

## v0.0.76 — 2026-03-08

**Commit:** `ae34e21` — fix: lazy-init OpenAI client to prevent backend crash when key is missing

- OpenAI client now lazily initialised — missing `OPENAI_API_KEY` no longer crashes the backend on startup

---

## v0.0.75 — 2026-03-08

**Commit:** `62adb71` — feat: embeddable support chat widget

- Self-contained vanilla JS chat widget with no dependencies
- `isSupport` and `isGuest` flags added to User model
- `/api/widget/support-agent` and `/api/widget/guest-session` endpoints
- Guest sessions persisted in sessionStorage
- Real-time chat via existing Socket.IO pipeline
- Support agent seeded via `seed-support-user.ts`
- Demo page at `/widget/demo.html`

---

## v0.0.74 — 2026-03-08

**Commit:** `9d4ecf5` — fix: ignore pem/key files, fix badge type, fix deploy SSH config

- Updated `.gitignore` for PEM/key files
- Fixed TypeScript badge type in header actions
- Fixed deployment SSH configuration and npm cache

---

## v0.0.73 — 2026-03-08

**Commit:** `e310a29` — Groups

- Group messaging foundation

---

## v0.0.72 — 2026-03-07

**Commit:** `052a58a` — feat: complete group member management — add/remove/promote/demote with real-time socket sync

- Full group member management: add, remove, promote, demote
- Real-time member changes via Socket.IO

---

## v0.0.71 — 2026-03-07

**Commit:** `cac7ca5` — fix: real-time group member state — handle removed/deleted events

- Fixed group member list not updating when members are removed
- Fixed owner change role update propagation

---

## v0.0.70 — 2026-03-06

**Commit:** `d9032c2` — WIP

- Work in progress — friends and groups iteration

---

## v0.0.69 — 2026-03-05

**Commit:** `26cac85` — fix: TS errors in FriendsPanel (profileImage undefined→null) and LoginForm stories

- Fixed TypeScript type errors in FriendsPanel
- Fixed LoginForm Storybook story imports

---

## v0.0.68 — 2026-03-05

**Commit:** `775ecdf` — wip

- Work in progress updates

---

## v0.0.67 — 2026-02-25

**Commit:** `dc47fae` — WIP

- Work in progress — messaging and UI

---

## v0.0.66 — 2026-02-24

**Commit:** `f03325b` — WIP

- Work in progress iteration

---

## v0.0.65 — 2026-02-24

**Commit:** `172e66d` — WIP

- Work in progress iteration

---

## v0.0.64 — 2026-02-24

**Commit:** `a83516c` — WIP

- Work in progress iteration

---

## v0.0.63 — 2026-02-24

**Commit:** `7999b83` — WIP

- Work in progress iteration

---

## v0.0.62 — 2026-02-24

**Commit:** `c704070` — Typing indicator

- Real-time typing indicators in conversations

---

## v0.0.61 — 2026-02-24

**Commit:** `792c3a7` — WIP

- Work in progress iteration

---

## v0.0.60 — 2026-02-24

**Commit:** `95cfd09` — WIP

- Work in progress iteration

---

## v0.0.59 — 2026-02-24

**Commit:** `de65a9b` — fix: remove storybook/prisma/swagger from deploy, fix npm install typo, fix next.config.js

- Removed unnecessary packages from production deployment
- Fixed npm install command typo
- Fixed `next.config.js` configuration

---

## v0.0.58 — 2026-02-24

**Commit:** `2c9c37a` — Update preview.tsx

- Storybook preview configuration update

---

## v0.0.57 — 2026-02-24

**Commit:** `173ddfc` — wip

- Work in progress iteration

---

## v0.0.56 — 2026-02-23

**Commit:** `3a7f319` — WIP

- Work in progress iteration

---

## v0.0.55 — 2026-02-23

**Commit:** `832e7de` — WIP

- Work in progress iteration

---

## v0.0.54 — 2026-02-23

**Commit:** `f4b4335` — styles

- UI styling updates

---

## v0.0.53 — 2026-02-23

**Commit:** `6d08ddd` — Styling

- Visual design and styling refinements

---

## v0.0.52 — 2026-02-23

**Commit:** `b69ddc1` — Style fixes

- Bug fixes for CSS and styling issues

---

## v0.0.51 — 2026-02-23

**Commit:** `81aaf0e` — WIP

- Work in progress iteration

---

## v0.0.50 — 2026-02-22

**Commit:** `aa95443` — wip

- Work in progress iteration

---

## v0.0.49 — 2026-02-22

**Commit:** `9714cb3` — Update handlers.ts

- Backend WebSocket event handler updates

---

## v0.0.48 — 2026-02-22

**Commit:** `fd5e549` — Update MessageBubble.tsx

- Message bubble component improvements

---

## v0.0.47 — 2026-02-22

**Commit:** `be30b06` — wip

- Work in progress iteration

---

## v0.0.46 — 2026-02-22

**Commit:** `1ceb059` — WIP

- Work in progress iteration

---

## v0.0.45 — 2026-02-22

**Commit:** `9641845` — Update MermaidDiagram.tsx

- Mermaid diagram rendering improvements

---

## v0.0.44 — 2026-02-22

**Commit:** `33aa7f0` — fix: extract MermaidDiagram to dynamic ssr:false component to fix production build

- MermaidDiagram extracted to a dynamic import with `ssr: false` to fix production build errors

---

## v0.0.43 — 2026-02-22

**Commit:** `ab2510a` — Create MermaidDiagram.tsx

- New component for rendering Mermaid syntax diagrams in documentation

---

## v0.0.42 — 2026-02-22

**Commit:** `7421e82` — Update next.config.js

- Next.js configuration update

---

## v0.0.41 — 2026-02-22

**Commit:** `05e96bd` — wip

- Work in progress iteration

---

## v0.0.40 — 2026-02-22

**Commit:** `3f30f55` — WIP

- Work in progress iteration

---

## v0.0.39 — 2026-02-22

**Commit:** `0b6bfad` — WIP

- Work in progress iteration

---

## v0.0.38 — 2026-02-22

**Commit:** `79668da` — wip

- Work in progress iteration

---

## v0.0.37 — 2026-02-22

**Commit:** `9306f40` — Documents

- Initial documentation structure and content

---

## v0.0.36 — 2026-02-22

**Commit:** `c38976d` — Update ConversationsList.tsx

- Conversations list component improvements

---

## v0.0.35 — 2026-02-22

**Commit:** `57cdf32` — WIP

- Work in progress iteration

---

## v0.0.34 — 2026-02-22

**Commit:** `036280f` — Update WebSocketStatusBadge.tsx

- WebSocket connection status badge improvements

---

## v0.0.33 — 2026-02-22

**Commit:** `82b947b` — Test works and been restructured

- Test suite restructured and working

---

## v0.0.32 — 2026-02-21

**Commit:** `295086c` — Update page.tsx

- Page component updates

---

## v0.0.31 — 2026-02-21

**Commit:** `03ed07e` — wip

- Work in progress iteration

---

## v0.0.30 — 2026-02-21

**Commit:** `ead5d4d` — wip

- Work in progress iteration

---

## v0.0.29 — 2026-02-21

**Commit:** `7b24841` — WIP

- Work in progress iteration

---

## v0.0.28 — 2026-02-21

**Commit:** `b070876` — wip

- Work in progress iteration

---

## v0.0.27 — 2026-02-21

**Commit:** `c81b4bb` — WIP

- Work in progress — early messaging implementation

---

## v0.0.26 — 2026-02-21

**Commit:** `7602c0b` — Update version.ts

- Version file configuration

---

## v0.0.25 — 2026-02-21

**Commit:** `6cadfd0` — Bump

- Version bump

---

## v0.0.24 — 2026-02-21

**Commit:** `1ddee58` — Update setup-hooks.sh

- Git hooks setup script update

---

## v0.0.23 — 2026-02-21

**Commit:** `4fa5c57` — Update version.ts

- Version tracking setup

---

## v0.0.22 — 2026-02-21

**Commit:** `ef32762` — Update post-commit

- Post-commit hook configuration

---

## v0.0.21 — 2026-02-21

**Commit:** `b27cefd` — versioning

- Auto-versioning system setup with post-commit hooks

---

## v0.0.20 — 2026-02-21

**Commit:** `bf1f4e7` — test

- Test configuration

---

## v0.0.19 — 2026-02-21

**Commit:** `188d95d` — test

- Test setup iteration

---

## v0.0.18 — 2026-02-21

**Commit:** `27f485f` — fix

- Early bug fix

---

## v0.0.17 — 2026-02-21

**Commit:** `b389bc2` — fix: remove extra closing div in test page causing JSX syntax error

- Fixed JSX syntax error from extra closing `</div>` tag

---

## v0.0.1 — 2026-02-21

**Commit:** `0f34370` — Initial

- Initial project setup
- Next.js frontend with App Router
- Express + Prisma + PostgreSQL backend
- Socket.IO real-time messaging foundation
- User authentication with JWT
- Basic conversation and messaging models
