# Changelog

All notable changes to Chatr are documented here, grouped by version/commit.

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
