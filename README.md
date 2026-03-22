# Chatr - Real-time Messaging Platform

**Status**: Active Development | **License**: MIT

A free, open source real-time messaging platform built with Next.js, Express, and PostgreSQL, featuring an embeddable support chat widget.

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

Visit `http://localhost:3000` (dashboard: `http://localhost:3000/dashboard`)

## Project Structure

```
chatr/
├── frontend/          # Next.js + React frontend
├── backend/           # Express + PostgreSQL backend
├── widget-src/        # Widget source + build script (not served)
├── widget/            # Minified widget + SVG icons (served at /widget/)
├── Documentation/     # Complete documentation
├── .husky/            # Git hooks (automated testing)
├── dev.sh             # Development startup script
├── deployAWS.sh       # AWS deployment (gitignored)
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

- [Documentation Index](./Documentation/index.md)
- [Getting Started](./Documentation/Getting-Started/LOCAL_SETUP.md)
- [Architecture](./Documentation/Architecture/index.md)
- [Testing](./Documentation/Testing/index.md)
- [API Reference](./Documentation/API/REST_API.md)
- [Widget](./Documentation/Widget/index.md)
- [Deployment](./Documentation/Getting-Started/DEPLOYMENT.md)

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
**Testing**: Jest, React Testing Library, Supertest
**Infrastructure**: AWS (EC2, RDS, ElastiCache, S3), Nginx, PM2

## Testing

- **Frontend**: 735 tests (React Testing Library)
- **Backend**: 87 tests (Supertest)
- **Widget**: 54 tests (Node.js, build pipeline)
- **Total**: 876 tests

## License

MIT — see [LICENSE](./LICENSE) for details.
