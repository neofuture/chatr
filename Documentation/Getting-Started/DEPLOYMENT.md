# AWS Deployment

## Infrastructure

| Component | AWS Service | Spec |
|-----------|------------|------|
| App server | EC2 | t3.small, Ubuntu 24.04 |
| Database | RDS PostgreSQL | db.t3.micro, pg16 |
| Cache | ElastiCache Redis | cache.t3.micro |
| File storage | S3 | Standard |
| Reverse proxy | Nginx | on EC2 |
| Process manager | PM2 | on EC2 |
| SSL | Let's Encrypt | via Certbot |

## URLs

| Service | URL |
|---------|-----|
| Frontend | https://chatr-app.online |
| Backend API | https://api.chatr-app.online |
| Swagger UI | https://api.chatr-app.online/api/docs |
| Prisma Studio | https://db.chatr-app.online |
| Health check | https://api.chatr-app.online/api/health |

## Architecture

```
Internet
    │
    ▼
Route 53 / DNS
    ├── chatr-app.online      → EC2 → Nginx → :3000 (Next.js)
    └── api.chatr-app.online  → EC2 → Nginx → :3001 (Express)
                                              │
                              ┌───────────────┼──────────────┐
                              ▼               ▼              ▼
                           RDS           ElastiCache        S3
                        PostgreSQL          Redis          Uploads
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `PORT` | Express port (default 3001) |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `FRONTEND_URL` | Frontend origin for CORS |
| `JWT_SECRET` | 32+ char secret for JWT signing |
| `AWS_REGION` | e.g. `eu-west-2` |
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `S3_BUCKET` | S3 bucket name |
| `PRODUCT_NAME` | App display name |
| `SWAGGER_USER` | Basic-auth user for Swagger UI |
| `SWAGGER_PASS` | Basic-auth password for Swagger UI |

### Frontend (`.env.production`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL e.g. `https://api.chatr-app.online` |
| `NEXT_PUBLIC_WS_URL` | Same as API URL |
| `NEXT_PUBLIC_PRODUCT_NAME` | App display name |

---

## Deployment Script

The `deployAWS.sh` script (gitignored — contains secrets) runs the full 7-step deployment automatically on the EC2 instance. The sanitised version below shows the exact logic with secrets replaced by `<PLACEHOLDER>` values.

> ⚠️  `deployAWS.sh` and `aws.sh` are listed in `.gitignore` and must **never** be committed.

### Quick start

```bash
# Full deploy — all 7 steps
bash aws.sh

# Backend only — git pull → build → prisma migrate → pm2 restart
bash aws.sh backend

# Frontend only — git pull → next build → pm2 restart
bash aws.sh frontend

# Docs only — rsync Documentation/ directly to server (no rebuild needed)
bash aws.sh docs
```

`aws.sh` handles everything automatically based on the target:

| Command | What runs on server |
|---|---|
| `bash aws.sh` | Steps 1–7 (full deploy) |
| `bash aws.sh backend` | `git pull` → build → migrate → `pm2 restart chatr-backend` |
| `bash aws.sh frontend` | `git pull` → `next build` → `pm2 restart chatr-frontend` |
| `bash aws.sh docs` | `rsync Documentation/` directly via SSH (no script needed) |

> ℹ️  `docs` is handled entirely in `aws.sh` via `rsync` — it never touches `deployAWS.sh` since docs are static markdown files served by the frontend.

Manual equivalents:

```bash
# Copy and run full deploy
scp -i ~/.ssh/chatr-key.pem deployAWS.sh ubuntu@<EC2_IP>:~/
ssh -i ~/.ssh/chatr-key.pem ubuntu@<EC2_IP> "bash ~/deployAWS.sh"

# Copy and run backend only
scp -i ~/.ssh/chatr-key.pem deployAWS.sh ubuntu@<EC2_IP>:~/
ssh -i ~/.ssh/chatr-key.pem ubuntu@<EC2_IP> "bash ~/deployAWS.sh backend"

# Sync docs directly (no script needed)
rsync -az --delete -e "ssh -i ~/.ssh/chatr-key.pem" \
  ./Documentation/ ubuntu@<EC2_IP>:/home/ubuntu/chatr/Documentation/
```

---

### Full Deploy Script (sanitised)

```bash
#!/bin/bash
# =============================================================================
# Chatr AWS Deployment Script
# Run ON the EC2 instance after SSHing in.
# ⚠️  NEVER commit this file — it contains secrets.
# =============================================================================

set -e

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}";
            echo -e "${BOLD}${CYAN}  $1${NC}";
            echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }
detail()  { echo -e "  ${CYAN}›${NC} $1"; }

# ── Config ─────────────────────────────────────────────────────────────────────
DOMAIN="chatr-app.online"
APP_DIR="/home/ubuntu/chatr"
REPO_URL="https://github.com/<ORG>/<REPO>"

DB_HOST="<RDS_ENDPOINT>.rds.amazonaws.com"
DB_NAME="chatr"
DB_USER="<DB_USER>"
DB_PASSWORD="<DB_PASSWORD>"
REDIS_HOST="<ELASTICACHE_ENDPOINT>.cache.amazonaws.com"
JWT_SECRET="<JWT_SECRET_32_CHARS_MIN>"
S3_BUCKET="<S3_BUCKET_NAME>"
AWS_REGION="eu-west-2"
AWS_ACCESS_KEY_ID="<AWS_ACCESS_KEY_ID>"
AWS_SECRET_ACCESS_KEY="<AWS_SECRET_ACCESS_KEY>"

# ── Derived URLs ───────────────────────────────────────────────────────────────
EC2_PUBLIC_IP=$(curl -s --connect-timeout 3 \
  http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || hostname -I | awk '{print $1}')

BACKEND_URL="https://api.${DOMAIN}"
FRONTEND_URL="https://${DOMAIN}"
DB_URL="https://db.${DOMAIN}"

echo ""
echo -e "${BOLD}  Chatr Deployment${NC}"
echo -e "  Server IP : ${EC2_PUBLIC_IP}"
echo -e "  Frontend  : ${FRONTEND_URL}"
echo -e "  Backend   : ${BACKEND_URL}"
echo -e "  DB Studio : ${DB_URL}"
echo -e "  App Dir   : ${APP_DIR}"
echo ""

# =============================================================================
# STEP 1 — System packages
# =============================================================================
step1_system() {
  step "STEP 1 — System Packages"

  sudo apt-get update -qq
  sudo apt-get install -y -qq \
    curl git nginx certbot python3-certbot-nginx \
    build-essential python3 postgresql-client apache2-utils
  success "System packages installed"

  # Node 20 (skip if already installed)
  if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  fi
  success "Node $(node -v) / npm $(npm -v)"

  # PM2 (skip if already installed)
  if ! command -v pm2 &>/dev/null; then
    sudo npm install -g pm2
    pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash
  fi
  success "PM2 $(pm2 -v)"
}

# =============================================================================
# STEP 2 — Clone repository
# =============================================================================
step2_code() {
  step "STEP 2 — Clone Repository"

  # Remove old install if present
  [ -d "$APP_DIR" ] && (rm -rf "$APP_DIR" 2>/dev/null || sudo rm -rf "$APP_DIR")

  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
  detail "Commit : $(git log -1 --oneline)"
  detail "Branch : $(git rev-parse --abbrev-ref HEAD)"

  # Disable husky — no git hooks on the server
  npm pkg set scripts.prepare="echo 'skip husky on server'"

  HUSKY=0 npm install --legacy-peer-deps
  success "Root dependencies installed"
}

# =============================================================================
# STEP 3 — Backend
# =============================================================================
step3_backend() {
  step "STEP 3 — Backend Setup"
  cd "$APP_DIR/backend"

  # Write .env with secrets
  cat > .env <<EOF
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
REDIS_URL=redis://${REDIS_HOST}:6379
FRONTEND_URL=${FRONTEND_URL}
BACKEND_URL=${BACKEND_URL}
JWT_SECRET=${JWT_SECRET}
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
S3_BUCKET=${S3_BUCKET}
PRODUCT_NAME=Chatr
SWAGGER_USER=admin
SWAGGER_PASS=${DB_PASSWORD}
EOF
  success ".env written"

  HUSKY=0 npm install --legacy-peer_deps
  npx prisma generate
  npm run build                  # tsc → dist/
  npx prisma migrate deploy
  success "Backend built and migrations applied"
}

# =============================================================================
# STEP 4 — Frontend
# =============================================================================
step4_frontend() {
  step "STEP 4 — Frontend Setup"
  cd "$APP_DIR/frontend"

  cat > .env.production <<EOF
NEXT_PUBLIC_WS_URL=${BACKEND_URL}
NEXT_PUBLIC_API_URL=${BACKEND_URL}
NEXT_PUBLIC_PRODUCT_NAME=Chatr
EOF
  success ".env.production written"

  HUSKY=0 npm install --legacy-peer_deps
  npm run build                  # next build → .next/
  success "Frontend built"
}

# =============================================================================
# STEP 5 — PM2
# =============================================================================
step5_pm2() {
  step "STEP 5 — PM2 Process Manager"

  # Stop any running instances
  pm2 delete chatr-backend  2>/dev/null || true
  pm2 delete chatr-frontend 2>/dev/null || true
  pm2 delete chatr-prisma   2>/dev/null || true

  sudo mkdir -p /var/log/chatr && sudo chown ubuntu:ubuntu /var/log/chatr

  cat > "$APP_DIR/ecosystem.config.js" <<EOF
module.exports = {
  apps: [
    {
      name: 'chatr-backend',
      cwd: '${APP_DIR}/backend',
      script: 'node',
      args: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      error_file: '/var/log/chatr/backend-error.log',
      out_file:   '/var/log/chatr/backend-out.log',
      time: true,
    },
    {
      name: 'chatr-frontend',
      cwd: '${APP_DIR}/frontend',
      script: '${APP_DIR}/frontend/node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      error_file: '/var/log/chatr/frontend-error.log',
      out_file:   '/var/log/chatr/frontend-out.log',
      time: true,
    },
    {
      name: 'chatr-prisma',
      cwd: '${APP_DIR}/backend',
      script: '${APP_DIR}/backend/node_modules/.bin/prisma',
      args: 'studio --port 5555 --browser none',
      instances: 1,
      exec_mode: 'fork',
      error_file: '/var/log/chatr/prisma-error.log',
      out_file:   '/var/log/chatr/prisma-out.log',
      time: true,
    }
  ]
};
EOF

  pm2 start "$APP_DIR/ecosystem.config.js"
  pm2 save
  sleep 3
  pm2 status
  success "PM2 processes started and saved"
}

# =============================================================================
# STEP 6 — Nginx + SSL
# =============================================================================
step6_nginx() {
  step "STEP 6 — Nginx & SSL"

  # Basic auth for Prisma Studio
  sudo htpasswd -cb /etc/nginx/.htpasswd-prisma admin "<DB_PASSWORD>"

  cat > /tmp/chatr-nginx.conf << 'ENDOFNGINX'
server {
    listen 80;
    server_name chatr-app.online www.chatr-app.online;
    client_max_body_size 20M;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 80;
    server_name api.chatr-app.online;
    client_max_body_size 20M;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}

server {
    listen 80;
    server_name db.chatr-app.online;
    auth_basic "Prisma Studio";
    auth_basic_user_file /etc/nginx/.htpasswd-prisma;
    location / {
        proxy_pass http://localhost:5555;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
ENDOFNGINX

  sudo cp /tmp/chatr-nginx.conf /etc/nginx/sites-available/chatr
  sudo ln -sf /etc/nginx/sites-available/chatr /etc/nginx/sites-enabled/chatr
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
  success "Nginx configured and reloaded"

  # SSL — will silently skip if DNS not yet pointed
  sudo certbot --nginx --expand \
    -d chatr-app.online \
    -d www.chatr-app.online \
    -d api.chatr-app.online \
    -d db.chatr-app.online \
    --non-interactive --agree-tos -m "admin@chatr-app.online" \
    && success "SSL certificates installed" \
    || warn "Certbot failed — run manually once DNS is pointed: sudo certbot --nginx"
}

# =============================================================================
# STEP 7 — Health checks
# =============================================================================
step7_check() {
  step "STEP 7 — Health Checks"
  sleep 5

  curl -sf "http://localhost:3001/api/health" > /dev/null \
    && success "Backend  UP — http://localhost:3001" \
    || warn    "Backend  DOWN — check: pm2 logs chatr-backend"

  curl -sf "http://localhost:3000" > /dev/null \
    && success "Frontend UP — http://localhost:3000" \
    || warn    "Frontend DOWN — check: pm2 logs chatr-frontend"

  curl -sf "http://localhost:5555" > /dev/null \
    && success "Prisma   UP — http://localhost:5555" \
    || warn    "Prisma   DOWN — check: pm2 logs chatr-prisma"

  pm2 status

  echo ""
  echo "════════════════════════════════════════════"
  echo "  ✅  Chatr deployed successfully!"
  echo "────────────────────────────────────────────"
  echo "  App  : ${FRONTEND_URL}"
  echo "  API  : ${BACKEND_URL}"
  echo "  DB   : ${DB_URL}"
  echo "  Logs : /var/log/chatr/"
  echo "════════════════════════════════════════════"
}

# =============================================================================
# Validate required config then run all steps
# =============================================================================
[ -z "$REPO_URL" ]    && error "Set REPO_URL"
[ -z "$DB_HOST" ]     && error "Set DB_HOST"
[ -z "$DB_PASSWORD" ] && error "Set DB_PASSWORD"
[ -z "$REDIS_HOST" ]  && error "Set REDIS_HOST"
[ -z "$JWT_SECRET" ]  && error "Set JWT_SECRET"

step1_system
step2_code
step3_backend
step4_frontend
step5_pm2
step6_nginx
step7_check
```

---

## Nginx Configuration

SSL is added automatically by Certbot, which adds port 443 blocks and HTTP → HTTPS redirects to the config above.

## PM2 Process Management

```bash
pm2 status                    # Process overview
pm2 logs                      # Tail all logs
pm2 logs chatr-backend        # Backend logs only
pm2 logs chatr-frontend       # Frontend logs only
pm2 logs chatr-prisma         # Prisma Studio logs
pm2 restart all               # Restart everything
pm2 restart chatr-backend     # Restart backend only
pm2 monit                     # Real-time dashboard
sudo tail -f /var/log/chatr/backend-error.log
sudo tail -f /var/log/chatr/frontend-error.log
```

## Updating the Application

```bash
# On the server
cd ~/chatr && git pull

# Backend
cd backend && npm install && npm run build && npx prisma migrate deploy && cd ..

# Frontend
cd frontend && npm install && npm run build && cd ..

# Restart
pm2 restart all
```

## Security Groups

| Group | Port | Source | Purpose |
|-------|------|--------|---------|
| chatr-sg | 22 | Your IP | SSH |
| chatr-sg | 80 | 0.0.0.0/0 | HTTP |
| chatr-sg | 443 | 0.0.0.0/0 | HTTPS |
| chatr-rds-sg | 5432 | chatr-sg | DB from EC2 only |
| chatr-redis-sg | 6379 | chatr-sg | Redis from EC2 only |

## DNS Records

| Type | Name | Value |
|------|------|-------|
| A | `@` | EC2 public IP |
| A | `www` | EC2 public IP |
| A | `api` | EC2 public IP |
| A | `db` | EC2 public IP |
