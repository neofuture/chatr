# Testing

## Test Stack

| Layer | Tool |
|-------|------|
| Test runner | Jest |
| Frontend component tests | React Testing Library |
| Backend integration tests | Supertest |
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

## Test Lab (Developer Tool)

The `/app/test` page in the frontend is a live developer tool for manually testing the full messaging stack without needing two separate browser sessions. It provides:

- WebSocket connection status and API configuration display
- User selector (loads all registered users)
- Message send/receive with real Socket.io events
- File and audio upload testing
- Voice recording test
- Typing indicator simulation (ghost typing mode)
- Presence toggle (manual offline)
- Scrollable system log with event payloads
- Message bubble rendering preview

This page is only accessible to authenticated users and is not linked from the main UI.

