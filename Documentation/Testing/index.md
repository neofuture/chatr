# Testing

## Test Stack

| Layer | Tool |
|-------|------|
| Test runner | Jest |
| Frontend component tests | React Testing Library |
| Backend integration tests | Supertest |
| E2E tests | Playwright (Chromium + Mobile) |
| Coverage | Jest built-in |
| DOM environment | jest-environment-jsdom |

## Running Tests

```bash
# All tests (from monorepo root)
npm test

# Frontend only
cd frontend && npm test

# Backend only
cd backend && npm test

# Watch mode
cd frontend && npm run test:watch
cd backend && npm run test:watch

# Coverage report
cd frontend && npm run test:coverage
cd backend && npm run test:coverage
```

## Frontend Tests

Located in `frontend/src/**/*.test.tsx`. Tests use React Testing Library to render components and assert on DOM output.

### Coverage areas
- Form components (Input, Button, Select, Checkbox, Textarea, Radio, DatePicker, RangeSlider)
- Auth forms (LoginForm, ForgotPassword, EmailVerification, LoginVerification)
- Layout components (AppLayout, MobileLayout)
- Feature components (ProfileImageUploader, CoverImageUploader, BottomSheet)
- Utility components (ThemeToggle, ToastContainer, Logo)

### Jest config (`frontend/jest.config.js`)

```js
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|scss)$': 'identity-obj-proxy'
  }
}
```

## Backend Tests

Located in `backend/src/__tests__/`. Tests use Supertest to make HTTP requests against the Express app with a mocked Prisma client.

### Coverage areas

| Test file | Routes covered |
|-----------|---------------|
| `auth.test.ts` | Registration, login, verification flows |
| `users.test.ts` | Username check, search, profile |
| `messages.test.ts` | History, conversations |
| `groups.test.ts` | CRUD, join, leave, messages |
| `images.test.ts` | Profile/cover image upload endpoints |

### Prisma mock

Prisma is mocked at the module level:

```typescript
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    // ...
  }))
}));
```

### Jest config (`backend/jest.config.js`)

```js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathPattern: 'src/__tests__',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }
}
```

## Widget Tests

Located in `widget-src/__tests__/widget.test.js`. Tests use Node.js (no DOM) to verify widget utility functions and the build pipeline.

### Coverage areas

| Test group | What's tested |
|-----------|---------------|
| Source sync | Verifies test implementations match widget source signatures |
| Pure functions | `escHtml`, `firstName`, `formatFileSize`, `formatTime`, `fmtSecs`, `hexToHsl`, `hslToHex`, `deriveAccent2`, `tokeniseCode`, `parseCodeBlocks`, `normaliseMsg` |
| Build pipeline | Source existence, minification, banner, Font Awesome removal, class name shortening, CSS custom property shortening, gzip budget (<15kB), REPLACE_MAP uniqueness, SVG icon files |

### Running widget tests

```bash
npm run test:widget
```

Widget tests are also included in the root `npm test` command.

## Coverage

Coverage reports are generated in `coverage/lcov-report/`. To view:

```bash
# Frontend
cd frontend && npm run test:coverage
open coverage/lcov-report/index.html

# Backend
cd backend && npm run test:coverage
open coverage/lcov-report/index.html
```

Target coverage thresholds (configured in Jest):

| Metric | Target |
|--------|--------|
| Statements | 70% |
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |

## Export Test Results

Both frontend and backend have an export script that writes Jest results to a JSON file for CI/reporting use:

```bash
cd frontend && npm run test:export
cd backend && npm run test:export
# or from root:
npm run test:export
```

Output: `frontend/test-results.json`, `backend/test-results.json`

## Test Lab (Developer Tool)

The `/app/test` page is a WebSocket playground for manually testing the messaging stack. It uses the `useConversation` hook which manages all messaging state, socket events, presence polling, and conversation summaries.

```mermaid
graph LR
    subgraph TestLab["/app/test — Developer Test Lab"]
        UserSelect["User Selector<br/>All registered users"]
        MessageThread["Message Thread<br/>Full conversation with MessageBubble"]
        InputBar["Input Bar<br/>Text · File · Voice · Emoji"]
        Indicators["Indicators<br/>Typing · Recording · Ghost text · Presence"]
        Logs["LogViewerPanel<br/>All socket events + payloads"]
    end
    UserSelect --> WS[Socket.io Server]
    InputBar --> WS
    WS --> Logs
    WS --> MessageThread
```

**Features:**
- User selector (loads all registered users from `GET /api/users`)
- Send text, file, image, audio, and voice messages
- Full conversation history with message caching (IndexedDB)
- Typing indicator buttons (start/stop)
- Ghost typing mode — real-time keystroke broadcast
- Presence toggle (go online/offline manually)
- Presence polling every 10 seconds
- `LogViewerPanel` with full event name + payload for every socket event
- Message bubble preview using the production `MessageBubble` component
- Audio waveform visualisation
- Lightbox image viewer
- Emoji reactions, edit, unsend, reply

This page is only accessible to authenticated users and is not linked from the main navigation.

---

## E2E Tests (Playwright)

Located in `e2e/`. Tests run against a live dev server with Chromium and a mobile viewport.

### Running E2E Tests

```bash
# All E2E tests
npx playwright test

# Specific test file
npx playwright test registration.spec.ts
npx playwright test profile.spec.ts

# With UI mode
npx playwright test --ui

# From the dashboard
# Click "Run E2E Tests" on the developer dashboard
```

### Test Files

| File | Description |
|------|-------------|
| `auth.spec.ts` | Login and authentication via AuthPanel |
| `registration.spec.ts` | User registration (API + browser UI panel) |
| `profile.spec.ts` | Profile management — display name, names, gender, avatar, cover image, data persistence |
| `dm-messaging.spec.ts` | Direct message send and receive |
| `messaging.spec.ts` | Real-time messaging — user search, message delivery |
| `group-management.spec.ts` | Group CRUD — create, invite, join, leave |
| `group-messaging.spec.ts` | Group message send and receive |
| `group-profile.spec.ts` | Group profile editing |
| `sockets.spec.ts` | WebSocket connection and events |

### Global Setup and Teardown

- **Global setup** (`e2e/global-setup.ts`): Enables test mode, runs `cleanup-all`, authenticates test users A and B
- **Global teardown** (`e2e/global-teardown.ts`): Cleans up test groups and disables test mode

### Test Helpers

| Helper | File | Description |
|--------|------|-------------|
| `browserLogin` | `e2e/helpers/auth.ts` | Log in via the AuthPanel UI with bypass OTP |
| `registerUser` | `e2e/helpers/api.ts` | Register a user via the API |
| `verifyEmail` | `e2e/helpers/api.ts` | Verify email with bypass OTP code |
| `deleteUser` | `e2e/helpers/api.ts` | Delete a test user and all related data |
| `getMe` | `e2e/helpers/api.ts` | Fetch the authenticated user's profile |

### Test Mode

The backend supports a test mode that:
- Accepts a bypass OTP code (`000000`) for all verification
- Exposes cleanup endpoints for test data removal
- Can be enabled/disabled via `POST /api/test/enable` and `POST /api/test/disable`
