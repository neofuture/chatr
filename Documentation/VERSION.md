# Changelog

All notable changes to Chatr are documented here. New entries are auto-generated on each commit by the post-commit hook and can be expanded with detail afterwards. Version numbers correspond to the auto-incremented build counter in `frontend/src/version.ts`.

---

## v0.0.151 — 2026-03-19

**Commit:** `f48e96d` — feat: docs light mode, settings to burger menu, compact theme toggle, Luna changelog, full version history

- Add light mode documentation to improve user guidance on theme options.
- Move settings to the burger menu for easier access and navigation.
- Introduce a compact theme toggle for enhanced user customization.
- Update the changelog to include full version history for better tracking of changes.

---

## v0.0.149 — 2026-03-14

**Commit:** `7f6c98c` — feat: auth panel, profile management, E2E tests, and socketFirst reliability

### Authentication Overhaul

- **Removed dedicated auth routes**: Deleted `/login`, `/register`, and `/setup-2fa` pages and their associated tests
- **AuthPanel-based authentication**: All login and registration now happens through the `AuthPanel` slide-in panel, triggered from the `SiteNav` avatar dropdown or footer CTA
- **Avatar dropdown menu**: When logged out, shows Login and Register options; when logged in, shows the user's avatar with Go to App and Logout options
- **Custom event system**: Footer "Create Account" button dispatches `chatr:open-auth` custom event to open the AuthPanel from any page
- **Auth state sync**: Added `chatr:auth-changed` custom event for cross-component auth state synchronisation without page reload
- **Default verification method**: Changed from SMS to Email as the default login verification method
- **Removed Demo2FA**: Deleted `Demo2FA` component, its Storybook stories, and all documentation references

### Profile Management

- **Direct HTTP fetch/save**: Profile panel (`MyProfilePanel`) now uses direct `fetch` API calls instead of `socketFirst` for reliability
- **Save status indicators**: Added real-time visual feedback — "Saving...", "Saved", "Save failed" — for all inline profile field edits
- **Fresh data on every view**: Profile page fetches data from the server on mount, supporting multi-device usage without stale `localStorage` data
- **Login response simplified**: Auth login endpoint now returns only minimal fields; profile data is fetched separately when needed

### socketFirst Reliability

- **Connected state guards**: All contexts and hooks (`FriendsContext`, `UserSettingsContext`, `useGroupsList`, `useConversation`, `BottomNav`) now gate `socketFirst` calls on the WebSocket `connected` boolean, preventing premature HTTP fallbacks and timeout cascades
- **Dashboard cache TTL**: Increased from 60 seconds to 5 minutes to reduce event loop blocking from synchronous `buildDashboard()` execution

### Navigation

- **Removed homepage auto-redirect**: Logged-in users are no longer auto-redirected from the marketing homepage to `/app`
- **Back to Web**: Added a "Back to Web" link in the app burger menu to navigate from `/app` back to the marketing site

### Image Configuration

- **next.config.js**: Added `images.remotePatterns` for `localhost:3001` (local backend uploads) and `*.amazonaws.com` (S3 production uploads)
- **SiteNav avatar**: Uses plain `<img>` tag instead of `next/image` to avoid hostname configuration issues with dynamic user-uploaded images

### E2E Testing

- **Registration tests** (`e2e/registration.spec.ts`): New test file covering API-based user registration with email verification, and browser UI panel registration flow
- **Profile tests** (`e2e/profile.spec.ts`): Comprehensive rewrite covering display name, first/last name, gender, profile image upload, cover image upload, API round-trip verification, gender cycling, and data persistence after page reload
- **Test cleanup endpoint**: Added `DELETE /api/test/user/:userId` for surgical E2E test user removal with cascading data cleanup
- **API helpers**: Added `registerUser()`, `verifyEmail()`, and `deleteUser()` helpers in `e2e/helpers/api.ts`
- **Global cleanup**: E2E global setup now calls `POST /api/test/cleanup-all` to ensure a clean slate before test execution

### Unit Test Fixes

- Updated `SiteNav.test.tsx` — added `useRouter`, `PanelContext`, and `ToastContext` mocks; fixed hamburger button selector for new DOM structure
- Updated `dashboard.test.tsx` — added router and context mocks; wrapped renders in `act()` for async state updates
- Updated `FriendsContext.test.tsx` — set `connected: true` in WebSocket mock to match new guard logic
- Updated `useGroupsList.test.ts` — set mock socket and token before fetch tests
- Updated `AuthPanel.test.tsx` — changed expected verification method from `'sms'` to `'email'`

---

## v0.0.148 — 2026-03-12

**Commit:** `b367f7a` — feat: expand test coverage, harden dashboard test runner, add stale results nag

- Expanded frontend and backend test coverage
- Hardened the dashboard test runner with better error handling
- Added stale results nag notification to the test dashboard

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

- Full marketing website implementation
- Fixed scrolling issues
- SiteNav component now renders across all marketing pages
- Pricing displayed in GBP

---

## v0.0.141 — 2026-03-06

**Commit:** `3dd59ac` — fix: build error, dependency vulnerabilities, and widget auth; add presentation assets

- Fixed build errors and dependency vulnerabilities
- Fixed widget authentication flow
- Added presentation assets

---

## v0.0.140 — 2026-03-05

**Commit:** `a01f0ab` — E2E

- Initial E2E test suite

---

## v0.0.139 — 2026-03-04

**Commit:** `5c6533d` — feat: E2E test suite, real-time dashboard streaming, and test mode infrastructure

- E2E test framework with Playwright
- Real-time dashboard streaming for test results
- Test mode infrastructure with test data cleanup

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

- Responsive image resizing for uploaded media
- Typing indicators now visible on conversation list items
- Fixed image loading and caching issues

---

## v0.0.136 — 2026-03-12

**Commit:** `093063e` — feat: improve group member management and fix summary engine performance

- Improved group member add/remove UI and reliability
- Optimised AI conversation summary engine performance

---

## v0.0.135 — 2026-03-12

**Commit:** `d87db02` — test: add summaryEngine test coverage for 100% backend module coverage

- Added comprehensive tests for the AI conversation summary engine
- Achieved 100% backend module test coverage

---

## v0.0.134 — 2026-03-12

**Commit:** `2d47b98` — fix: lazy-import music-metadata and reduce bcrypt cost in auth tests

- Lazy-import `music-metadata` to reduce startup time
- Reduced bcrypt rounds in test environment for faster test execution

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

- Offline message queue with Dexie/IndexedDB — messages sent while offline are queued and synced when reconnected
- Local cache hydration for instant message display on app load
- Syncing UI indicator for pending outbound messages

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

- Group profile page with cover image and group avatar uploads
- Inline group name editing
- Member list with role management (promote/demote/remove)

---

## v0.0.126 — 2026-03-11

**Commit:** `8748db8` — feat: add vulnerability details, JSDoc for all endpoints, and clean-state indicators

- Dashboard vulnerability scanner with detailed CVE information
- Added JSDoc documentation to all backend API endpoints
- Clean-state indicators when no issues found

---

## v0.0.125 — 2026-03-11

**Commit:** `247da61` — test: add comprehensive frontend and backend test coverage

- Major test coverage expansion across frontend components and backend services

---

## v0.0.124 — 2026-03-11

**Commit:** `e3a44c5` — feat: add commit size graph, shell script support in language metrics, and UI polish

- Commit size visualisation graph on dashboard
- Shell scripts counted in language breakdown metrics
- Various UI polish and consistency improvements

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

- Extracted component styles from `globals.css` into co-located CSS modules

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

- Major documentation refresh covering widget, video messaging, and deployment guides

---

## v0.0.95 — 2026-03-10

**Commit:** `62c5384` — fix: load mermaid from CDN, add widget tests, resolve vulnerabilities

- Mermaid diagrams now loaded from CDN
- Added widget unit tests
- Resolved npm audit vulnerabilities

---

## v0.0.94 — 2026-03-10

**Commit:** `3bed90b` — feat: video messages, code blocks, read more, widget build pipeline

- Video message support with inline playback
- Code block rendering in messages with syntax highlighting
- "Read more" truncation for long messages
- Widget build and minification pipeline

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
