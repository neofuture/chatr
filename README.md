# Chatr - Real-time Messaging App

**Status**: Active Development | **License**: MIT

The chat application for the Chatr platform — built with Next.js, Express, and PostgreSQL, featuring real-time messaging and an embeddable support chat widget. The marketing website lives in a separate `chatr-website` repository.

> **Production**: `app.chatr-app.online` (this app) · `chatr-app.online` (marketing website)

## Quick Start

```bash
# Install dependencies
npm install                    # Root (monorepo + terser)
cd frontend && npm install
cd ../backend && npm install

# Setup database
cd backend
npx prisma migrate dev
npx prisma generate

# Start everything (backend, frontend, widget watcher)
cd ..
bash dev.sh
```

Visit `https://localhost:3000` — unauthenticated users are redirected to `/login`.

## Project Structure

```
chatr/
├── frontend/          # Next.js + React app (served at app.chatr-app.online)
├── backend/           # Express + PostgreSQL API (api.chatr-app.online)
├── widget-src/        # Widget source + build script (not served)
├── widget/            # Minified widget + SVG icons (served at /widget/)
├── e2e/               # Playwright E2E tests (168 tests)
├── Documentation/     # Complete documentation
├── .husky/            # Git hooks (automated testing)
├── dev.sh             # Development startup script
├── aws.sh             # Quick deploy (reads .env.deploy)
├── deployAWS.sh       # Full AWS deployment script
└── package.json       # Monorepo scripts
```

## Key Features

- Real-time messaging (Socket.io)
- JWT authentication with email/SMS verification & resend
- Video, image, audio, and file sharing (50MB limit) with optional captions
- Embeddable support chat widget (vanilla JS, ~12 kB gzipped)
- Profile and cover images
- Message requests, friends, and presence
- Collapsible long messages ("Read more")
- Code block syntax highlighting
- Offline-first (IndexedDB)
- Dark/light themes
- Responsive design
- Developer dashboard (git stats, LOC, code churn, commit streaks, code ownership, stale files, bundle size, branch/tag counts, untested components, Prisma complexity, contribution heatmap)

## Documentation

- **[Getting Started](./Documentation/GETTING_STARTED.md)** — Full setup guide with Mailtrap, SMS, OpenAI, and AWS configuration
- [Documentation Index](./Documentation/index.md)
- [Local Setup (quick)](./Documentation/Getting-Started/Local_Setup.md)
- [Architecture](./Documentation/Architecture/index.md)
- [Testing](./Documentation/Testing/index.md)
- [API Reference](./Documentation/API/Rest_Api.md)
- [Widget](./Documentation/Widget/index.md)
- [Deployment](./Documentation/Getting-Started/Deployment.md)

## Development

### Frontend
```bash
cd frontend
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Production build
```

### Backend
```bash
cd backend
npm run dev          # Start dev server
npm test             # Run tests
npm run build        # Compile TypeScript
```

### Widget
```bash
npm run widget:build   # One-off build
npm run widget:watch   # Watch mode
npm run test:widget    # Run widget tests
```

### Run All Tests
```bash
# From root — runs frontend + backend + widget tests
npm test
```

## Git Hooks

Automated testing on commit via Husky:
- Tests run automatically
- Commit blocked if tests fail

Disable: `git commit --no-verify`

## Tech Stack

**Frontend**: Next.js, React 19, TypeScript, Socket.io Client, IndexedDB
**Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma, Socket.io, Redis
**Widget**: Vanilla JavaScript, Canvas API, Terser
**Testing**: Jest, React Testing Library, Supertest, Playwright
**Infrastructure**: AWS (EC2, RDS, ElastiCache, S3), Nginx, PM2

## Testing

- **Frontend**: ~1,475 tests (React Testing Library)
- **Backend**: ~1,133 tests (Supertest)
- **Widget**: 54 tests (Node.js, build pipeline)
- **E2E**: 168 tests (Playwright — 14 spec files × Desktop Chrome + iPhone 14)
- **Total**: 2,800+ tests

Run `npm test` for unit tests, `npm run test:e2e` for E2E. The dashboard at `chatr-app.online/dashboard` shows live results.

## License

MIT — see [LICENSE](./LICENSE) for details.
