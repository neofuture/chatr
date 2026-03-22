# Getting Started

A step-by-step guide to running Chatr locally and configuring each external service.

---

## Prerequisites

| Tool       | Version | Purpose                            | Install                           |
|------------|---------|------------------------------------|-----------------------------------|
| Node.js    | 20.x    | Runtime for frontend and backend   | https://nodejs.org                |
| npm        | 10.x    | Package manager (bundled with Node)| —                                 |
| Docker     | 24.x+   | Runs PostgreSQL and Redis locally  | https://docker.com                |
| Git        | any     | Version control                    | https://git-scm.com               |

---

## 1. Clone & Install

```bash
git clone https://github.com/neofuture/chatr.git
cd chatr
npm install            # root monorepo (Husky hooks, Terser)
cd frontend && npm install
cd ../backend && npm install
cd ..
```

---

## 2. Configure Environment Variables

### Backend (`backend/.env`)

Copy the example and edit:

```bash
cd backend
cp .env.example .env
```

The minimum config to get running (the defaults in `.env.example` work out of the box with Docker):

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://chatr_user:chatr_password@localhost:5432/chatr
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
JWT_SECRET=pick-any-string-at-least-32-characters-long
```

### Frontend (`frontend/.env.local`)

```bash
cd frontend
cp .env.example .env.local
```

Contents:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_PRODUCT_NAME=Chatr
```

---

## 3. Start Everything

```bash
bash dev.sh
```

This single command handles everything:
- Starts Docker containers (PostgreSQL + Redis)
- Waits for databases to be healthy
- Runs pending Prisma migrations
- Starts the backend (`http://localhost:3001`)
- Starts the frontend (`http://localhost:3000`)
- Starts Prisma Studio (`http://localhost:5555`)
- Starts Storybook (`http://localhost:6006`)
- Starts the widget file watcher
- Starts the dashboard cache invalidator

Press `Ctrl+C` to stop everything (including Docker containers).

### Verify

- `http://localhost:3000` — Landing page
- `http://localhost:3001/api/health` — Should return `{ "status": "ok" }`
- `http://localhost:3000/dashboard` — Developer dashboard

---

## 4. External Services (Optional)

Chatr works locally without any external services. Emails log to the console, SMS is suppressed, AI features are disabled, and files are stored on disk. Configure the services below to enable full functionality.

### Mailtrap (Email)

Used for: email verification, login verification codes, password reset emails.

**Without it:** Verification codes are printed to the backend console. You can still register and log in by reading the code from the terminal output.

**Setup:**

1. Create a free account at [mailtrap.io](https://mailtrap.io)
2. Go to **Email Sending** > **Sending Domains** and verify a domain (or use the sandbox for testing)
3. Go to **Email Sending** > **SMTP/API Settings** and copy your **API Token**
4. Add to `backend/.env`:

```env
MAILTRAP_API_KEY=your_api_token_here
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME=Chatr
```

> **Tip:** Mailtrap's free tier gives 1,000 emails/month — plenty for development.

---

### SMS Works (SMS Verification)

Used for: phone number verification via SMS OTP (UK mobile numbers).

**Without it:** SMS is suppressed in development. OTPs are logged to the backend console.

**Setup:**

1. Create an account at [thesmsworks.co.uk](https://thesmsworks.co.uk)
2. Get your API JWT token from the dashboard
3. Add to `backend/.env`:

```env
SMS_WORKS_JWT=your_jwt_token_here
ENABLE_SMS=1
```

**Dev phone bypass:** To avoid sending real SMS during development, set a bypass number:

```env
DEV_PHONE=+447700000000
```

Any account using this phone number will have OTPs logged to the console instead.

---

### OpenAI (AI Assistant — Luna)

Used for: Luna chatbot assistant, automatic conversation summaries.

**Without it:** Luna is unavailable. Conversations won't have AI-generated summaries. Everything else works normally.

**Setup:**

1. Get an API key from [platform.openai.com](https://platform.openai.com)
2. Add to `backend/.env`:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

Chatr uses `gpt-4o-mini` by default — the cheapest model. Typical usage costs pennies per day.

---

### AWS S3 (File Storage — Production Only)

Used for: storing uploaded images, videos, voice notes, and files in production.

**Without it:** Files are stored on the local filesystem at `backend/uploads/`. This is the default in development and works fine.

**Setup (production only):**

1. Create an S3 bucket in your AWS account
2. Create an IAM user with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` permissions
3. Add to `backend/.env`:

```env
NODE_ENV=production
S3_BUCKET=your-bucket-name
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret-key
```

---

## Complete Backend `.env` Reference

```env
# ── Required ──────────────────────────────────────────
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://chatr_user:chatr_password@localhost:5432/chatr
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
JWT_SECRET=pick-any-string-at-least-32-characters-long

# ── Email (Mailtrap) ─────────────────────────────────
# MAILTRAP_API_KEY=your_api_token
# MAIL_FROM_ADDRESS=noreply@yourdomain.com
# MAIL_FROM_NAME=Chatr
# CONTACT_EMAIL=you@example.com

# ── SMS (SMS Works) ──────────────────────────────────
# SMS_WORKS_JWT=your_jwt_token
# ENABLE_SMS=1
# DEV_PHONE=+447700000000

# ── AI (OpenAI) ──────────────────────────────────────
# OPENAI_API_KEY=sk-your-key

# ── File Storage (AWS S3 — production only) ──────────
# S3_BUCKET=your-bucket
# AWS_REGION=eu-west-2
# AWS_ACCESS_KEY_ID=AKIA...
# AWS_SECRET_ACCESS_KEY=your-secret

# ── Dashboard ────────────────────────────────────────
# DASHBOARD_TEST_PASSWORD=optional-password-for-test-runner

# ── Database Tuning ──────────────────────────────────
# DATABASE_POOL_SIZE=20
# DATABASE_POOL_TIMEOUT=10
```

---

## Running Tests

```bash
# All tests (frontend + backend + widget)
npm test

# Frontend only (1,475+ tests)
cd frontend && npm test

# Backend only (300+ tests)
cd backend && npm test

# Widget only
npm run test:widget
```

Tests run automatically on every commit via Husky pre-commit hooks. Commits are blocked if any test fails. Skip with `git commit --no-verify` if needed.

---

## Resetting Everything

```bash
# Reset the database (drops all data, re-runs migrations)
cd backend && npx prisma migrate reset

# Nuclear reset — remove Docker volumes and start fresh
docker compose down -v
bash dev.sh
```

---

## Deploying to AWS

Chatr includes a one-command deploy script that provisions an EC2 instance with Nginx, SSL, PM2, and your full stack. All secrets live in `.env.deploy` (gitignored).

### 1. Set up AWS infrastructure

You'll need:
- An **EC2 instance** (Ubuntu 22.04+) with ports 22, 80, 443 open
- An **RDS PostgreSQL** instance (or any PostgreSQL server)
- An **ElastiCache Redis** cluster (or any Redis server)
- An **S3 bucket** for file uploads
- A **domain** with DNS A records pointing to your EC2 IP

### 2. Configure `.env.deploy`

```bash
cp .env.deploy.example .env.deploy
```

Fill in your server address, SSH key path, database credentials, Redis host, JWT secret, AWS keys, and domain. See `.env.deploy.example` for documentation of every field.

### 3. Deploy

```bash
# Full deploy (system packages, code, build, Nginx, SSL)
bash aws.sh

# Or deploy only what changed
bash aws.sh backend    # rebuild & restart backend only
bash aws.sh frontend   # rebuild & restart frontend only
bash aws.sh docs       # sync Documentation folder only
```

### Auto-deploy on commit

If `.env.deploy` exists, every `git commit` automatically triggers `bash aws.sh` in the background. Deployment progress is logged to `deploy.log`. If `.env.deploy` is missing, the deploy step is silently skipped.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on port 5432 | `dev.sh` starts Docker automatically — make sure Docker Desktop is running |
| `ECONNREFUSED` on port 6379 | Same as above — Redis runs in Docker via `dev.sh` |
| Emails not sending | Check `MAILTRAP_API_KEY` in `.env`. Without it, codes print to the console |
| SMS not sending | SMS is suppressed in dev by default. Set `ENABLE_SMS=1` to enable |
| Luna not responding | Set `OPENAI_API_KEY` in `.env`. Without it, Luna is disabled |
| File uploads failing in prod | Ensure `S3_BUCKET`, `AWS_REGION`, and AWS credentials are set |
| Git hooks not running | Run `npm install` from the project root to reinstall Husky |
| Tests failing on commit | Fix the failing tests, or bypass with `git commit --no-verify` |
