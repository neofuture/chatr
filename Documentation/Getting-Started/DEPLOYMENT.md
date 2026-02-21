# AWS Deployment

## Infrastructure

| Component | AWS Service | Spec |
|-----------|------------|------|
| App server | EC2 `16.60.35.172` | t3.small, Ubuntu 24.04 |
| Database | RDS PostgreSQL | db.t3.micro, pg16 |
| Cache | ElastiCache Redis | cache.t3.micro |
| File storage | S3 | Standard |
| Reverse proxy | Nginx | on EC2 |
| Process manager | PM2 | on EC2 |
| SSL | Let's Encrypt | via Certbot |

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

### Frontend (`.env.production`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL e.g. `https://api.chatr-app.online` |
| `NEXT_PUBLIC_WS_URL` | Same as API URL |
| `NEXT_PUBLIC_PRODUCT_NAME` | App display name |

## Deployment Script

The deploy script (`deployAWS.sh` — gitignored) automates the full deployment:

1. Installs system packages (Node 20, Nginx, PM2, Certbot)
2. Clones / pulls latest code from GitHub
3. Writes `.env` files from script variables
4. Installs dependencies and builds both apps
5. Runs Prisma migrations
6. Configures PM2 process manager
7. Configures Nginx reverse proxy
8. Obtains SSL certificates via Certbot

```bash
# Copy to server (run on local Mac)
scp -i ~/.ssh/chatr-key.pem deployAWS.sh ubuntu@<EC2_IP>:~/

# SSH in and run
ssh -i ~/.ssh/chatr-key.pem ubuntu@<EC2_IP>
chmod +x ~/deployAWS.sh && ~/deployAWS.sh
```

> ⚠️ `deployAWS.sh` contains secrets and is listed in `.gitignore`. Never commit it.

## Nginx Configuration

```nginx
# Frontend
server {
    listen 80;
    server_name chatr-app.online www.chatr-app.online;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Backend API + WebSocket
server {
    listen 80;
    server_name api.chatr-app.online;
    client_max_body_size 20M;
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }
}
```

SSL is added automatically by Certbot, which modifies this config to add port 443 blocks and redirect HTTP → HTTPS.

## PM2 Process Management

```bash
pm2 status                    # View running processes
pm2 logs                      # Tail all logs
pm2 logs chatr-backend        # Backend logs only
pm2 logs chatr-frontend       # Frontend logs only
pm2 restart all               # Restart both processes
pm2 restart chatr-backend     # Restart backend only
pm2 monit                     # Real-time dashboard
```

## Updating the Application

```bash
# On the server
cd ~/chatr
git pull

# Rebuild backend
cd backend && npm install && npm run build && npx prisma migrate deploy && cd ..

# Rebuild frontend
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

