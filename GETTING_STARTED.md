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

## 2. Start PostgreSQL & Redis

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432` (user: `chatr_user`, password: `chatr_password`, db: `chatr`)
- **Redis 7** on `localhost:6379`

Both containers use Docker volumes for persistence. Run `docker compose down -v` to reset data.

---

## 3. Configure Environment Variables

### Backend (`backend/.env`)

Copy the example and edit:

```bash
cd backend
cp .env.example .env
```

The minimum config to get running:

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

## 4. Run Database Migrations

```bash
cd backend
npx prisma migrate dev
```

This creates all 9 database tables. You only need to run this once (and again after pulling new migrations).

---

## 5. Start Development Servers

From the project root:

```bash
bash dev.sh
```

Or start each service manually:

```bash
# Terminal 1 — Backend
cd backend && npm run dev      # http://localhost:3001

# Terminal 2 — Frontend
cd frontend && npm run dev     # http://localhost:3000
```

Verify everything works:
- `http://localhost:3000` — Landing page
- `http://localhost:3001/api/health` — Should return `{ "status": "ok" }`

---

## 6. External Services (Optional)

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

## Deploying to AWS (Production)

Chatr includes a fully automated deployment pipeline for AWS. Two scripts handle everything:

| File | Purpose |
|------|---------|
| `aws.sh` | Runs locally — connects to your EC2 instance via SSH, uploads secrets, and triggers the deploy |
| `deployAWS.sh` | Runs on the server — installs packages, clones the repo, builds, configures Nginx + SSL |

Both scripts are committed to the repo. **All secrets live in `.env.deploy`** which is gitignored.

### AWS Prerequisites

| Service | Purpose | Notes |
|---------|---------|-------|
| EC2 instance | Runs the app (t3.small or larger) | Ubuntu 22.04+, port 22/80/443 open |
| RDS PostgreSQL | Production database | Free tier eligible |
| ElastiCache Redis | Caching and real-time pub/sub | Free tier eligible |
| S3 bucket | File uploads (images, voice notes, videos) | Optional — falls back to local disk |
| Domain name | Custom URL with SSL | DNS A records pointing to EC2 IP |
| SSH key (.pem) | Authenticate to EC2 | Download when creating the instance |

### Step 1 — Create `.env.deploy`

```bash
cp .env.deploy.example .env.deploy
```

Edit `.env.deploy` with your actual values:

```env
# SSH connection
DEPLOY_SERVER=ubuntu@ec2-xx-xx-xx-xx.region.compute.amazonaws.com
DEPLOY_KEY=./your-key.pem

# Domain (leave empty to use raw IP)
DEPLOY_DOMAIN=yourdomain.com

# Database (AWS RDS)
DB_HOST=your-db.region.rds.amazonaws.com
DB_NAME=chatr
DB_USER=chatr_user
DB_PASSWORD=your-password

# Redis (AWS ElastiCache)
REDIS_HOST=your-redis.region.cache.amazonaws.com

# Auth — generate with: openssl rand -hex 32
JWT_SECRET=your-64-char-hex-string

# AWS S3 (optional)
S3_BUCKET=your-bucket
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=your-secret

# Optional services (emails/SMS/AI work without these — codes print to console)
OPENAI_API_KEY=sk-your-key
MAILTRAP_API_KEY=your-token
MAIL_FROM_ADDRESS=noreply@yourdomain.com
SMS_WORKS_JWT=your-jwt

# Dashboard & support
DASHBOARD_TEST_PASSWORD=your-password
SUPPORT_AGENT_EMAIL=you@example.com
```

### Step 2 — Deploy

```bash
# Full deploy (first time or major update)
bash aws.sh

# Backend only (API changes, migrations)
bash aws.sh backend

# Frontend only (UI changes)
bash aws.sh frontend

# Documentation only (syncs Documentation/ folder)
bash aws.sh docs
```

The full deploy takes 5–10 minutes and performs these steps:
1. Enables swap memory (prevents OOM on small instances)
2. Installs system packages (Node 20, Nginx, Certbot, PM2)
3. Clones the latest code from GitHub
4. Installs dependencies, generates Prisma client, compiles TypeScript
5. Runs database migrations
6. Builds the Next.js frontend
7. Starts backend + frontend via PM2
8. Configures Nginx with SSL (via Let's Encrypt)
9. Runs health checks

### Step 3 — Auto-deploy on commit

The project includes a Husky `post-commit` hook that auto-deploys if `.env.deploy` exists:

```bash
# Auto-deploy triggers automatically after every successful commit
# To disable, remove or rename .env.deploy
```

### Useful server commands

```bash
# SSH into the server
ssh -i ./your-key.pem ubuntu@your-ec2-host

# Process management
pm2 status                    # overview
pm2 logs chatr-backend        # backend logs
pm2 logs chatr-frontend       # frontend logs
pm2 restart all               # restart everything

# Error logs
sudo tail -f /var/log/chatr/backend-error.log
sudo tail -f /var/log/chatr/frontend-error.log
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

# Reset Docker containers and volumes
docker compose down -v
docker compose up -d
cd backend && npx prisma migrate dev
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ECONNREFUSED` on port 5432 | Run `docker compose up -d` — PostgreSQL isn't running |
| `ECONNREFUSED` on port 6379 | Run `docker compose up -d` — Redis isn't running |
| Emails not sending | Check `MAILTRAP_API_KEY` in `.env`. Without it, codes print to the console |
| SMS not sending | SMS is suppressed in dev by default. Set `ENABLE_SMS=1` to enable |
| Luna not responding | Set `OPENAI_API_KEY` in `.env`. Without it, Luna is disabled |
| File uploads failing in prod | Ensure `S3_BUCKET`, `AWS_REGION`, and AWS credentials are set |
| Git hooks not running | Run `npm install` from the project root to reinstall Husky |
| Tests failing on commit | Fix the failing tests, or bypass with `git commit --no-verify` |
