#!/bin/bash
# =============================================================================
# Chatr AWS Deployment Script
# Run from your local machine — it SSHes into EC2 automatically.
# Usage: ./deployAWS.sh              (full deploy)
#        ./deployAWS.sh backend      (backend only)
#        ./deployAWS.sh frontend     (frontend only)
#
# All secrets are read from .env.deploy (gitignored).
# Copy .env.deploy.example to .env.deploy and fill in your values.
# =============================================================================

# ── Load config from .env.deploy ─────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.deploy"

# If running on macOS (local machine), load .env.deploy and forward to EC2
if [[ "$(uname)" == "Darwin" ]]; then
  if [ ! -f "$ENV_FILE" ]; then
    echo -e "\033[0;31m[ERROR]\033[0m .env.deploy not found. Copy .env.deploy.example to .env.deploy and fill in your values."
    exit 1
  fi

  # Source .env.deploy for SSH config
  set -a; source "$ENV_FILE"; set +a

  PEM_KEY="${DEPLOY_KEY:-./Chatr-key.pem}"
  # Resolve relative path
  [[ "$PEM_KEY" != /* ]] && PEM_KEY="$SCRIPT_DIR/$PEM_KEY"
  SERVER="${DEPLOY_SERVER}"
  SSH_OPTS="-i $PEM_KEY -o StrictHostKeyChecking=no -o ConnectTimeout=10"

  echo ""
  echo -e "\033[1m  Chatr Remote Deploy\033[0m"
  echo -e "  Target: ${SERVER}"
  echo -e "  PEM   : ${PEM_KEY}"
  echo ""

  if [ -z "$SERVER" ]; then
    echo -e "\033[0;31m[ERROR]\033[0m DEPLOY_SERVER not set in .env.deploy"
    exit 1
  fi

  if [ ! -f "$PEM_KEY" ]; then
    echo -e "\033[0;31m[ERROR]\033[0m SSH key not found: $PEM_KEY"
    exit 1
  fi

  chmod 600 "$PEM_KEY" 2>/dev/null || true

  echo -e "\033[0;34m[INFO]\033[0m Uploading deploy script + config to server..."
  scp $SSH_OPTS "$0" "${SERVER}:/tmp/_chatr_deploy.sh"
  scp $SSH_OPTS "$ENV_FILE" "${SERVER}:/tmp/_chatr_deploy.env"

  echo -e "\033[0;34m[INFO]\033[0m Running deploy on server..."
  echo ""
  ssh $SSH_OPTS -t "${SERVER}" \
    "chmod +x /tmp/_chatr_deploy.sh && /tmp/_chatr_deploy.sh $* ; rm -f /tmp/_chatr_deploy.sh /tmp/_chatr_deploy.env"
  exit $?
fi

# ═════════════════════════════════════════════════════════════════════════════
# Everything below runs ON the EC2 instance
# ═════════════════════════════════════════════════════════════════════════════

set -e

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
step()    { echo -e "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BOLD}${CYAN}  $1${NC}"; echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }
detail()  { echo -e "  ${CYAN}›${NC} $1"; }

# ── Maintenance mode helpers ──────────────────────────────────────────────
maintenance_on() {
  info "Enabling maintenance mode..."
  sudo mkdir -p /var/www/maintenance
  if [ -f /tmp/_chatr_maintenance.html ]; then
    sudo cp /tmp/_chatr_maintenance.html /var/www/maintenance/index.html
  fi

  # Detect existing SSL certs (Let's Encrypt) — keep using them during maintenance
  SSL_CERT=""; SSL_KEY=""
  for d in /etc/letsencrypt/live/*/; do
    if [ -f "${d}fullchain.pem" ] && [ -f "${d}privkey.pem" ]; then
      SSL_CERT="${d}fullchain.pem"
      SSL_KEY="${d}privkey.pem"
      break
    fi
  done

  # Only generate self-signed as a last resort if no real certs exist
  if [ -z "$SSL_CERT" ]; then
    if [ ! -f /etc/nginx/ssl-fallback.crt ]; then
      sudo openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl-fallback.key \
        -out /etc/nginx/ssl-fallback.crt \
        -subj "/CN=maintenance" 2>/dev/null
    fi
    SSL_CERT="/etc/nginx/ssl-fallback.crt"
    SSL_KEY="/etc/nginx/ssl-fallback.key"
    detail "No Let's Encrypt certs found — using self-signed fallback"
  else
    detail "Reusing existing SSL cert: $SSL_CERT"
  fi

  sudo tee /etc/nginx/sites-available/chatr-maintenance > /dev/null <<MAINT
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    listen 443 ssl default_server;
    listen [::]:443 ssl default_server;
    server_name _;
    root /var/www/maintenance;
    index index.html;

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};

    location / {
        try_files \$uri /index.html =503;
    }

    error_page 503 /index.html;
}
MAINT
  sudo ln -sf /etc/nginx/sites-available/chatr-maintenance /etc/nginx/sites-enabled/chatr-maintenance
  sudo rm -f /etc/nginx/sites-enabled/chatr 2>/dev/null || true
  sudo nginx -t 2>/dev/null && sudo systemctl reload nginx
  success "Maintenance mode ON — site showing deploy page"
}

maintenance_off() {
  info "Disabling maintenance mode..."
  sudo rm -f /etc/nginx/sites-enabled/chatr-maintenance
  sudo ln -sf /etc/nginx/sites-available/chatr /etc/nginx/sites-enabled/chatr
  sudo nginx -t 2>/dev/null && sudo systemctl reload nginx
  sudo rm -rf /var/www/maintenance
  success "Maintenance mode OFF — live site restored"
}

# ── Load config from .env.deploy (uploaded by local machine) ──────────────────
if [ -f /tmp/_chatr_deploy.env ]; then
  set -a; source /tmp/_chatr_deploy.env; set +a
fi

# ── Config (all read from .env.deploy) ───────────────────────────────────────
DOMAIN="${DEPLOY_DOMAIN:-}"
APP_DIR="/home/ubuntu/chatr"
REPO_URL="https://github.com/neofuture/chatr"

DB_HOST="${DB_HOST:?DB_HOST not set in .env.deploy}"
DB_NAME="${DB_NAME:-chatr}"
DB_USER="${DB_USER:-chatr_user}"
DB_PASSWORD="${DB_PASSWORD:?DB_PASSWORD not set in .env.deploy}"
REDIS_HOST="${REDIS_HOST:?REDIS_HOST not set in .env.deploy}"
REDIS_TLS="${REDIS_TLS:-false}"
JWT_SECRET="${JWT_SECRET:?JWT_SECRET not set in .env.deploy}"
S3_BUCKET="${S3_BUCKET:-}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
OPENAI_API_KEY="${OPENAI_API_KEY:-}"
DASHBOARD_TEST_PASSWORD="${DASHBOARD_TEST_PASSWORD:-}"
MAILTRAP_API_KEY="${MAILTRAP_API_KEY:-}"
MAIL_FROM_ADDRESS="${MAIL_FROM_ADDRESS:-}"
MAIL_FROM_NAME="${MAIL_FROM_NAME:-Chatr}"
CONTACT_EMAIL="${CONTACT_EMAIL:-}"
SMS_WORKS_JWT="${SMS_WORKS_JWT:-}"
SUPPORT_AGENT_EMAIL="${SUPPORT_AGENT_EMAIL:-}"

# ── Derived URLs ──────────────────────────────────────────────────────────────
EC2_PUBLIC_IP=$(curl -s --connect-timeout 3 http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)
[ -z "$EC2_PUBLIC_IP" ] && EC2_PUBLIC_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")
if [ -n "$DOMAIN" ]; then
  BACKEND_URL="https://api.${DOMAIN}"
  FRONTEND_URL="https://${DOMAIN}"
  info "Domain: $DOMAIN — make sure DNS A records point to $EC2_PUBLIC_IP"
else
  BACKEND_URL="http://${EC2_PUBLIC_IP}:3001"
  FRONTEND_URL="http://${EC2_PUBLIC_IP}:3000"
  warn "No DOMAIN set — using raw IP. Fine for testing, use a domain for production."
fi

echo ""
echo -e "${BOLD}  Chatr Deployment${NC}"
echo -e "  Server IP : ${EC2_PUBLIC_IP}"
echo -e "  Frontend  : ${FRONTEND_URL}"
echo -e "  Backend   : ${BACKEND_URL}"
echo -e "  App Dir   : ${APP_DIR}"
echo -e "  Repo      : ${REPO_URL}"
echo ""

# =============================================================================
# STEP 0 — Swap (prevent OOM kills during npm install)
# =============================================================================
step0_swap() {
  step "STEP 0 — Swap Memory"

  if swapon --show | grep -q '/swapfile'; then
    detail "Swap already active — $(swapon --show --bytes | awk 'NR==2 {printf "%.0fMB", $3/1024/1024}')"
    success "Swap ready"
    return
  fi

  info "Creating 2GB swapfile at /swapfile..."
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile

  # Make permanent across reboots
  if ! grep -q '/swapfile' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab > /dev/null
    detail "Added /swapfile to /etc/fstab"
  fi

  # Tune swappiness for a server workload
  sudo sysctl vm.swappiness=10 > /dev/null
  echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf > /dev/null

  success "2GB swap active — $(free -h | awk '/^Swap:/ {print $2}') total swap"
}

# =============================================================================
# STEP 1 — System packages
# =============================================================================
step1_system() {
  step "STEP 1 — System Packages"

  info "Updating apt package list..."
  sudo apt-get update -qq
  success "Package list updated"

  info "Installing system dependencies..."
  sudo apt-get install -y -qq \
    curl git nginx certbot python3-certbot-nginx \
    build-essential python3 postgresql-client
  success "System packages installed: curl git nginx certbot python3-certbot-nginx build-essential python3 postgresql-client"

  if ! command -v node &>/dev/null; then
    info "Node.js not found — installing Node 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    success "Node.js installed"
  else
    detail "Node.js already installed: $(node -v)"
  fi
  success "Node $(node -v) / npm $(npm -v)"

  if ! command -v pm2 &>/dev/null; then
    info "PM2 not found — installing globally..."
    sudo npm install -g pm2
    detail "Setting up PM2 startup script..."
    pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | sudo bash
    success "PM2 installed and startup configured"
  else
    detail "PM2 already installed: $(pm2 -v)"
  fi
  success "PM2 $(pm2 -v)"
}

# =============================================================================
# STEP 2 — Clone / pull code
# =============================================================================
step2_code() {
  step "STEP 2 — Clone Repository"
  [ -z "$REPO_URL" ] && error "Set REPO_URL at the top of this script"

  if [ -d "$APP_DIR" ]; then
    info "Removing existing app directory: $APP_DIR"
    rm -rf "$APP_DIR" 2>/dev/null || sudo rm -rf "$APP_DIR"
    success "Old directory removed"
  fi

  info "Cloning $REPO_URL into $APP_DIR..."
  git clone "$REPO_URL" "$APP_DIR"
  success "Repository cloned"

  cd "$APP_DIR"
  detail "Current commit: $(git log -1 --oneline)"
  detail "Branch: $(git rev-parse --abbrev-ref HEAD)"

  info "Disabling husky for server environment..."
  npm pkg set scripts.prepare="echo 'skip husky on server'"
  success "Husky disabled"

  info "Clearing npm cache..."
  npm cache clean --force 2>/dev/null || true
  rm -rf node_modules frontend/node_modules backend/node_modules 2>/dev/null || true
  success "Cache and node_modules cleared"

  info "Disabling workspaces for independent installs..."
  node -e "const p=require('./package.json'); delete p.workspaces; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2)+'\n')"
  success "Workspaces removed from root package.json"

  info "Installing backend dependencies..."
  cd "$APP_DIR/backend"
  HUSKY=0 npm install --no-package-lock --legacy-peer-deps --loglevel=error
  success "Backend deps installed ($(ls node_modules | wc -l | tr -d ' ') modules)"

  info "Installing frontend dependencies..."
  cd "$APP_DIR/frontend"
  HUSKY=0 npm install --no-package-lock --legacy-peer-deps --loglevel=error
  success "Frontend deps installed ($(ls node_modules | wc -l | tr -d ' ') modules)"

  cd "$APP_DIR"
}

# =============================================================================
# STEP 3 — Backend
# =============================================================================
step3_backend() {
  step "STEP 3 — Backend Setup"

  cd "$APP_DIR/backend"
  detail "Working directory: $(pwd)"

  info "Writing backend .env..."
  cat > .env <<EOF
PORT=3001
NODE_ENV=production
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}
REDIS_URL=$( [ "$REDIS_TLS" = "true" ] && echo "rediss" || echo "redis" )://${REDIS_HOST}:6379
FRONTEND_URL=${FRONTEND_URL}
BACKEND_URL=${BACKEND_URL}
JWT_SECRET=${JWT_SECRET}
AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
S3_BUCKET=${S3_BUCKET}
PRODUCT_NAME=Chatr
OPENAI_API_KEY=${OPENAI_API_KEY:-}
SUPPORT_AGENT_EMAIL=${SUPPORT_AGENT_EMAIL:-}
DASHBOARD_TEST_PASSWORD=${DASHBOARD_TEST_PASSWORD}
MAILTRAP_API_KEY=${MAILTRAP_API_KEY:-}
MAIL_FROM_ADDRESS=${MAIL_FROM_ADDRESS:-}
MAIL_FROM_NAME=${MAIL_FROM_NAME:-Chatr}
CONTACT_EMAIL=${CONTACT_EMAIL:-}
SMS_WORKS_JWT=${SMS_WORKS_JWT:-}
EOF
  success ".env written"
  detail "DB Host   : $DB_HOST"
  detail "DB Name   : $DB_NAME"
  detail "Redis Host: $REDIS_HOST"
  detail "S3 Bucket : $S3_BUCKET"
  detail "AWS Region: $AWS_REGION"

  info "Generating Prisma client..."
  npx prisma generate
  success "Prisma client generated"

  info "Compiling TypeScript..."
  npm run build
  success "TypeScript compiled → dist/"
  detail "Output files: $(find dist -name '*.js' | wc -l | tr -d ' ') JS files"

  info "Running database migrations..."
  # NOTE: This only applies schema migrations — it does NOT seed test data.
  npx prisma migrate deploy
  success "Migrations applied"

  info "Marking support agent in database..."
  SUPPORT_AGENT_EMAIL="${SUPPORT_AGENT_EMAIL}" \
    npx ts-node --project tsconfig.seed.json prisma/seed-support-user.ts 2>&1 \
    && success "Support agent configured" \
    || warn "Support agent seed failed (may not exist yet — run manually after first login)"
}

# =============================================================================
# STEP 4 — Frontend
# =============================================================================
step4_frontend() {
  step "STEP 4 — Frontend Setup"
  cd "$APP_DIR/frontend"
  detail "Working directory: $(pwd)"

  info "Writing frontend .env.production..."
  cat > .env.production <<EOF
NEXT_PUBLIC_WS_URL=${BACKEND_URL}
NEXT_PUBLIC_API_URL=${BACKEND_URL}
NEXT_PUBLIC_PRODUCT_NAME=Chatr
EOF
  success ".env.production written"
  detail "API URL : $BACKEND_URL"
  detail "WS URL  : $BACKEND_URL"

  info "Building Next.js production bundle (this may take a while)..."
  npm run build
  success "Frontend built"
  detail "Build output: $(du -sh .next 2>/dev/null | cut -f1) in .next/"

  info "Building Storybook static site..."
  npm run build-storybook 2>&1 | tail -5
  success "Storybook built"
  detail "Storybook output: $(du -sh storybook-static 2>/dev/null | cut -f1) in storybook-static/"
}

# =============================================================================
# STEP 5 — PM2
# =============================================================================
step5_pm2() {
  step "STEP 5 — PM2 Process Manager"

  info "Stopping all existing PM2 processes..."
  pm2 delete all 2>/dev/null && detail "All PM2 processes stopped" || detail "No PM2 processes were running"

  info "Creating log directory /var/log/chatr..."
  sudo mkdir -p /var/log/chatr
  sudo chown ubuntu:ubuntu /var/log/chatr
  success "Log directory ready"

  info "Writing PM2 ecosystem config..."
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
      env: {
        NODE_ENV: 'production',
        NODE_PATH: '${APP_DIR}/backend/node_modules',
      },
      error_file: '/var/log/chatr/backend-error.log',
      out_file:   '/var/log/chatr/backend-out.log',
      time: true,
    },
    {
      name: 'chatr-frontend',
      cwd: '${APP_DIR}/frontend',
      script: 'npx',
      args: 'next start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: { NODE_ENV: 'production' },
      error_file: '/var/log/chatr/frontend-error.log',
      out_file:   '/var/log/chatr/frontend-out.log',
      time: true,
    },
  ]
};
EOF
  success "ecosystem.config.js written (backend + frontend only)"

  info "Starting PM2 processes..."
  pm2 start "$APP_DIR/ecosystem.config.js"
  success "PM2 processes started"

  info "Saving PM2 process list for auto-restart on reboot..."
  pm2 save
  success "PM2 state saved"

  detail "Waiting 3s for processes to stabilise..."
  sleep 3
  pm2 status
}

# =============================================================================
# STEP 6 — Nginx + SSL
# =============================================================================
step6_nginx() {
  step "STEP 6 — Nginx & SSL"

  info "Writing Nginx site config..."
  cat > /tmp/chatr-nginx.conf <<ENDOFNGINX
# Redirect www → non-www so there is only one origin for CORS
server {
    listen 80;
    server_name www.${DOMAIN};
    return 301 https://${DOMAIN}\$request_uri;
}

# Frontend
server {
    listen 80;
    server_name ${DOMAIN};
    client_max_body_size 55M;

    location /storybook/ {
        alias /home/ubuntu/chatr/frontend/storybook-static/;
        index index.html;
        try_files \$uri \$uri/ =404;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# API backend
server {
    listen 80;
    server_name api.${DOMAIN};
    client_max_body_size 55M;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
        proxy_connect_timeout 10;
        proxy_send_timeout 60;
    }
}
ENDOFNGINX

  sudo cp /tmp/chatr-nginx.conf /etc/nginx/sites-available/chatr
  detail "Config written to /etc/nginx/sites-available/chatr"

  sudo ln -sf /etc/nginx/sites-available/chatr /etc/nginx/sites-enabled/chatr
  detail "Symlink created in sites-enabled"

  sudo rm -f /etc/nginx/sites-enabled/default
  detail "Default site disabled"

  info "Testing Nginx config..."
  sudo nginx -t
  success "Nginx config valid"

  info "Reloading Nginx..."
  sudo systemctl reload nginx
  success "Nginx reloaded"

  info "Requesting SSL certificates via Certbot..."
  detail "Domains: ${DOMAIN}, www.${DOMAIN}, api.${DOMAIN}"
  sudo certbot --nginx \
    --expand \
    -d "${DOMAIN}" \
    -d "www.${DOMAIN}" \
    -d "api.${DOMAIN}" \
    --non-interactive --agree-tos -m "admin@${DOMAIN}" \
    && success "SSL certificates installed and Nginx updated" \
    || warn "Certbot failed — DNS may not be pointed yet. Run manually: sudo certbot --nginx"
}

# =============================================================================
# STEP 7 — Health check
# =============================================================================
step7_check() {
  step "STEP 7 — Health Checks"

  info "Waiting 8s for services to fully start..."
  sleep 8

  info "Checking backend (http://localhost:3001/api/health)..."
  BACKEND_UP=false
  for i in 1 2 3; do
    if curl -sf --max-time 5 "http://localhost:3001/api/health" > /dev/null 2>&1; then
      BACKEND_UP=true
      break
    fi
    sleep 3
  done
  if $BACKEND_UP; then
    success "Backend is up — http://localhost:3001"
  else
    warn "Backend not responding — check: pm2 logs chatr-backend"
  fi

  info "Checking frontend (http://localhost:3000)..."
  FRONTEND_UP=false
  for i in 1 2 3 4 5; do
    if curl -sf --max-time 5 "http://localhost:3000" > /dev/null 2>&1; then
      FRONTEND_UP=true
      break
    fi
    sleep 5
  done
  if $FRONTEND_UP; then
    success "Frontend is up — http://localhost:3000"
  else
    warn "Frontend not yet responding (may still be starting) — check: pm2 logs chatr-frontend"
  fi

  echo ""
  info "PM2 process status:"
  pm2 status

  echo ""
  echo -e "${GREEN}${BOLD}════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}${BOLD}  ✅  Chatr deployed successfully!${NC}"
  echo -e "${GREEN}${BOLD}────────────────────────────────────────────────${NC}"
  echo -e "${GREEN}  App : ${FRONTEND_URL}${NC}"
  echo -e "${GREEN}  API : ${BACKEND_URL}${NC}"
  echo -e "${GREEN}  Logs: /var/log/chatr/${NC}"
  echo -e "${GREEN}${BOLD}════════════════════════════════════════════════${NC}"
  echo ""
  echo "Useful commands:"
  echo "  pm2 status                — process overview"
  echo "  pm2 logs                  — live logs (all)"
  echo "  pm2 logs chatr-backend    — backend logs only"
  echo "  pm2 logs chatr-frontend   — frontend logs only"
  echo "  pm2 restart all           — restart everything"
  echo "  sudo tail -f /var/log/chatr/backend-error.log"
  echo "  sudo tail -f /var/log/chatr/frontend-error.log"
}

# =============================================================================
# Parse target argument
# =============================================================================
TARGET="${1:-}"

# =============================================================================
# Validate required config before doing anything
# =============================================================================
[ -z "$REPO_URL" ]    && error "Set REPO_URL"
[ -z "$DB_HOST" ]     && error "Set DB_HOST"
[ -z "$DB_PASSWORD" ] && error "Set DB_PASSWORD"
[ -z "$REDIS_HOST" ]  && error "Set REDIS_HOST"
[ -z "$JWT_SECRET" ]  && error "Set JWT_SECRET"

# =============================================================================
# Route based on target
# =============================================================================
case "$TARGET" in

  # ── Backend only ────────────────────────────────────────────────────────────
  backend)
    echo -e "\n${BOLD}${CYAN}  Mode: BACKEND only${NC}\n"
    maintenance_on
    step0_swap
    cd "$APP_DIR"
    git checkout -- . 2>/dev/null || true
    info "Pulling latest code..."
    git pull
    success "Code updated  ($(git log -1 --oneline))"

    step3_backend

    info "Restarting chatr-backend via PM2..."
    pm2 restart chatr-backend || pm2 start "$APP_DIR/ecosystem.config.js" --only chatr-backend
    pm2 save
    success "chatr-backend restarted"

    sleep 2
    curl -sf "http://localhost:3001/api/health" > /dev/null \
      && success "Backend UP — http://localhost:3001" \
      || warn    "Backend not responding — check: pm2 logs chatr-backend"
    maintenance_off
    ;;

  # ── Frontend only ───────────────────────────────────────────────────────────
  frontend)
    echo -e "\n${BOLD}${CYAN}  Mode: FRONTEND only${NC}\n"
    maintenance_on
    step0_swap
    cd "$APP_DIR"
    git checkout -- . 2>/dev/null || true
    info "Pulling latest code..."
    git pull
    success "Code updated  ($(git log -1 --oneline))"

    step4_frontend

    info "Restarting chatr-frontend via PM2..."
    pm2 restart chatr-frontend || pm2 start "$APP_DIR/ecosystem.config.js" --only chatr-frontend
    pm2 save
    success "chatr-frontend restarted"

    sleep 2
    curl -sf "http://localhost:3000" > /dev/null \
      && success "Frontend UP — http://localhost:3000" \
      || warn    "Frontend not responding — check: pm2 logs chatr-frontend"
    maintenance_off
    ;;

  # ── Full deploy (no arg) ────────────────────────────────────────────────────
  "")
    echo -e "\n${BOLD}${CYAN}  Mode: FULL DEPLOY${NC}\n"
    maintenance_on
    step0_swap
    step1_system
    step2_code
    step3_backend
    step4_frontend
    step5_pm2
    step6_nginx
    step7_check
    # step6_nginx restores the real config; just clean up maintenance files
    sudo rm -rf /var/www/maintenance 2>/dev/null || true
    sudo rm -f /etc/nginx/sites-available/chatr-maintenance 2>/dev/null || true
    ;;

  # ── Unknown target ──────────────────────────────────────────────────────────
  *)
    error "Unknown target '${TARGET}'. Valid options: backend, frontend"
    ;;

esac

