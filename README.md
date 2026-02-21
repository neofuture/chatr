# Chatr - Real-time Messaging Platform

**Status**: 🟢 Active Development

A modern real-time messaging platform built with Next.js, Express, and PostgreSQL.

## Quick Start

```bash
# Install dependencies
cd frontend && npm install
cd ../backend && npm install

# Setup database
cd backend
npx prisma migrate dev
npx prisma generate

# Start development servers
npm run dev  # Backend (port 3001)
cd ../frontend
npm run dev  # Frontend (port 3000)
```

Visit `http://localhost:3000`

## Project Structure

```
chatrr/
├── frontend/          # Next.js + React frontend
├── backend/           # Express + PostgreSQL backend
├── Documentation/     # Complete documentation
├── .husky/           # Git hooks (automated testing)
└── package.json      # Monorepo scripts
```

## Key Features

- ✅ Real-time messaging (Socket.io)
- ✅ JWT authentication
- ✅ Email/SMS verification (Twilio)
- ✅ Profile & cover images
- ✅ Offline-first (IndexedDB)
- ✅ Dark/light themes
- ✅ Responsive design

## Documentation

- 📖 [Complete Documentation](./Documentation/README.md)
- 🚀 [Getting Started](./Documentation/Getting-Started/START_HERE.md)
- 🏗️ [Architecture](./Documentation/Architecture/CURRENT_ARCHITECTURE.md)
- 🧪 [Testing](./Documentation/Testing/README.md)
- 📝 [API Reference](./Documentation/API/API_ARCHITECTURE.md)
- 📋 [Changelog](./Documentation/CHANGELOG.md)

## Development

### Frontend
```bash
cd frontend
npm run dev          # Start dev server
npm test            # Run tests
npm run build       # Production build
```

### Backend
```bash
cd backend
npm run dev          # Start dev server
npm test            # Run tests
npm run build       # Compile TypeScript
```

### Run All Tests
```bash
# From root
npm test

# Export test results
npm run test:export
```

## Git Hooks

**Automated testing on commit!**

When you commit code:
- ✅ Tests run automatically
- ✅ Test results exported to markdown
- ✅ Documentation updated
- ❌ Commit blocked if tests fail

Disable: `git commit --no-verify`

[Git Hooks Guide](./Documentation/Testing/GIT_HOOKS.md)

## Tech Stack

**Frontend**: Next.js 15, React 19, TypeScript, Socket.io Client, IndexedDB
**Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma, Socket.io
**Testing**: Jest, React Testing Library
**Infrastructure**: Docker-ready, CI/CD ready

## Environment Variables

See `.env.example` files in frontend and backend folders.

## Testing

- **Frontend**: 14 tests, ~74% coverage
- **Backend**: Test infrastructure ready
- **Git Hooks**: Auto-run on commit

[Testing Documentation](./Documentation/Testing/README.md)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

Tests run automatically via git hooks.

## License

Private project

---

**Documentation**: [/Documentation/](./Documentation/)
**Status**: [PROJECT_STATUS.md](./Documentation/PROJECT_STATUS.md)
**API**: [API_ARCHITECTURE.md](./Documentation/API/API_ARCHITECTURE.md)

