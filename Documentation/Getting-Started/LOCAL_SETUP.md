# Local Development Setup

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x | https://nodejs.org |
| npm | 10.x | bundled with Node |
| Docker | 24.x+ | https://docker.com |
| Git | any | https://git-scm.com |

## 1. Clone the repository

```bash
git clone https://github.com/neofuture/chatr.git
cd chatr
```

## 2. Start infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
```

This starts:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

## 3. Backend setup

```bash
cd backend
cp .env.example .env   # or create .env manually (see below)
npm install
npx prisma migrate dev
npm run dev
```

Backend runs at `http://localhost:3001`

**`.env` minimum config:**
```
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://chatr_user:chatr_password@localhost:5432/chatr
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-min-32-chars
```

## 4. Frontend setup

```bash
cd frontend
cp .env.local.example .env.local   # or create manually
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`

**`.env.local` minimum config:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_PRODUCT_NAME=Chatr
```

## 5. Verify

- Open `http://localhost:3000` — landing page should load
- Open `http://localhost:3001/api/health` — should return `{ "status": "ok" }`
- Open `http://localhost:3000/app/test` (after logging in) — developer test lab

## Development Scripts

### Backend
```bash
npm run dev          # Start with ts-node-dev (hot reload)
npm run build        # Compile TypeScript to dist/
npm test             # Run Jest test suite
npm run test:watch   # Watch mode
```

### Frontend
```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm start            # Serve production build
npm test             # Run Jest test suite
```

### Root (monorepo)
```bash
npm test             # Run all tests (frontend + backend)
```

## Dev Phone Bypass

For local development without a real SMS provider, a dev phone bypass is available. Set the following in `backend/.env`:

```
DEV_PHONE=+447700000000
```

Any account using this phone number will have SMS OTPs logged to the console instead of sent via SMS.

## Git Hooks

The project uses a `post-commit` hook to auto-increment the frontend version (`frontend/src/version.ts`) after every commit. The hook is installed automatically via `npm install` (triggered by the `prepare` script).

If hooks stop working (e.g. after re-initialising git), run:

```bash
bash setup-Hooks.sh
```

Or simply:

```bash
npm install
```

## Resetting the database

```bash
cd backend
npx prisma migrate reset    # Drops all data and re-runs migrations
```



