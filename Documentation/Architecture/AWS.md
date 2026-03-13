# AWS Infrastructure

## Overview

Chatr runs entirely in AWS `eu-west-2` (London). All services are in the same region. The EC2 instance is the only publicly exposed resource — RDS and ElastiCache are on the private VPC and not reachable from the internet.

---

## Service Map

```mermaid
graph TD
    Internet["Internet"]

    subgraph DNS["DNS — Namecheap"]
        D1["chatr-app.online"]
        D2["api.chatr-app.online"]
        D3["db.chatr-app.online"]
    end

    subgraph EC2["EC2 t3.small — Ubuntu 24.04 — 16.60.35.172"]
        Nginx["Nginx<br/>SSL termination<br/>:80 → :443"]

        subgraph PM2["PM2"]
            FE["chatr-frontend<br/>Next.js — :3000"]
            BE["chatr-backend<br/>Express + Socket.io — :3001"]
            PS["chatr-prisma<br/>Prisma Studio — :5555"]
        end

        SSL["Let's Encrypt<br/>Certbot"]
    end

    subgraph VPC["VPC Private Subnet — eu-west-2"]
        RDS["RDS PostgreSQL 16<br/>db.t3.micro — :5432"]
        Redis["ElastiCache Redis<br/>cache.t3.micro — :6379"]
    end

    S3["S3<br/>chatr-uploads"]

    Internet --> DNS
    DNS --> Nginx
    Nginx -->|":3000"| FE
    Nginx -->|":3001"| BE
    Nginx -->|":5555 basic auth"| PS
    BE -->|"Prisma — :5432"| RDS
    BE -->|"ioredis — :6379"| Redis
    BE -->|"AWS SDK"| S3
    PS -->|":5432"| RDS
```

---

## Nginx Routing

| Domain | Proxies to | Notes |
|--------|-----------|-------|
| `chatr-app.online` | `:3000` | Next.js frontend |
| `www.chatr-app.online` | `:3000` | www redirect |
| `api.chatr-app.online` | `:3001` | Express API + WebSocket |
| `db.chatr-app.online` | `:5555` | Prisma Studio — basic auth required |

All domains terminate SSL at Nginx via Let's Encrypt certificates. HTTP (port 80) is auto-redirected to HTTPS (port 443) by Certbot.

WebSocket upgrade headers are passed through on `api.chatr-app.online`:
```
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 86400;
```

---

## EC2 Instance

| Property | Value |
|----------|-------|
| Instance type | t3.small |
| OS | Ubuntu 24.04 LTS |
| Public IP | `16.60.35.172` |
| Region | eu-west-2 (London) |
| App directory | `/home/ubuntu/chatr` |
| Log directory | `/var/log/chatr/` |
| Process manager | PM2 |

### PM2 Processes

Managed via `ecosystem.config.cjs` in the project root. The backend runs in **cluster mode** to use all available CPU cores:

```bash
pm2 start ecosystem.config.cjs    # start all
pm2 restart ecosystem.config.cjs  # restart all
pm2 reload chatr-backend           # zero-downtime reload
```

| Name | Script | Mode | Instances | Port | Logs |
|------|--------|------|-----------|------|------|
| `chatr-backend` | `node dist/index.js` | cluster | `max` (= vCPUs) | `3001` | `/var/log/chatr/backend-out.log` |
| `chatr-frontend` | `next start` | fork | 1 | `3000` | `/var/log/chatr/frontend-out.log` |

> **Why cluster mode for the backend?** Socket.io + the Redis adapter already handles sticky sessions across processes. Each cluster worker gets its own Prisma connection pool, multiplying throughput. On a t3.small (2 vCPU) you get 2 workers × 20 connections = 40 DB connections and double the request handling capacity.

### Security Group Ports

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP (redirects to HTTPS) |
| 443 | TCP | 0.0.0.0/0 | HTTPS + WSS |

> Ports 3000, 3001, and 5555 are **not** open to the internet — traffic reaches them only via Nginx on the same host.

---

## RDS PostgreSQL

| Property | Value |
|----------|-------|
| Engine | PostgreSQL 16 |
| Instance class | db.t3.micro |
| Host | `chatr-db.cb20yaey0epm.eu-west-2.rds.amazonaws.com` |
| Port | `5432` |
| Database | `chatr` |
| User | `chatr_user` |
| Access | VPC private only — EC2 security group |

### Connection Pool Sizing

The backend uses a Prisma singleton (`src/lib/prisma.ts`) that appends `connection_limit` and `pool_timeout` to the `DATABASE_URL` at startup. These are controlled by env vars:

| Env Var | Default | Purpose |
|---------|---------|---------|
| `DATABASE_POOL_SIZE` | `20` | Connections per Node.js process |
| `DATABASE_POOL_TIMEOUT` | `10` | Seconds to wait for a free connection |

With PM2 cluster mode, total connections = `instances × pool size`. RDS default `max_connections` varies by instance class:

| RDS Instance | RAM | Default max_connections | Recommended pool per process |
|-------------|-----|------------------------|------------------------------|
| db.t3.micro | 1 GB | ~87 | 20 (2 processes = 40) |
| db.t3.small | 2 GB | ~174 | 20 (2 processes = 40) |
| db.t3.medium | 4 GB | ~341 | 25 (2 processes = 50) |

> **To change `max_connections` on RDS:** Create a custom Parameter Group in the AWS console (RDS → Parameter groups → Create), set `max_connections` to your desired value, then modify your RDS instance to use the new parameter group. Requires a reboot.

> **Rule of thumb:** Keep total Prisma connections at ~50% of `max_connections` to leave headroom for Prisma Studio, migrations, and monitoring.

---

## ElastiCache Redis

| Property | Value |
|----------|-------|
| Engine | Redis |
| Instance class | cache.t3.micro |
| Host | `master.chatr-redis.bxugin.euw2.cache.amazonaws.com` |
| Port | `6379` |
| Access | VPC private only — EC2 security group |
| Used for | User presence, online status maps |

---

## S3

| Property | Value |
|----------|-------|
| Bucket | `chatr-uploads` |
| Region | `eu-west-2` |
| Access | IAM key from EC2 only |
| Contents | Profile images, cover images, audio, file attachments |

---

## SSL Certificates

Managed by Certbot with the Nginx plugin. Certificates are auto-renewed via a cron job installed by Certbot.

```
Domains:  chatr-app.online
          www.chatr-app.online
          api.chatr-app.online
          db.chatr-app.online

Issuer:   Let's Encrypt
Cert dir: /etc/letsencrypt/live/chatr-app.online/
```

---

## Network Flow

```mermaid
sequenceDiagram
    participant U as User Browser
    participant N as Nginx :443
    participant FE as Next.js :3000
    participant BE as Express :3001
    participant DB as RDS :5432
    participant RD as Redis :6379
    participant S3 as S3

    U->>N: HTTPS GET chatr-app.online
    N->>FE: proxy :3000
    FE-->>U: HTML / JS / CSS

    U->>N: HTTPS POST api.chatr-app.online/api/auth/login
    N->>BE: proxy :3001
    BE->>DB: SELECT user WHERE email=...
    DB-->>BE: user row
    BE-->>U: JWT token

    U->>N: WSS api.chatr-app.online (Upgrade)
    N->>BE: proxy :3001 with upgrade headers
    BE->>RD: set user presence online
    BE-->>U: Socket.io connected

    U->>N: HTTPS POST api.chatr-app.online/api/messages/upload
    N->>BE: proxy :3001
    BE->>S3: PutObject
    BE->>DB: INSERT message
    BE-->>U: messageId + fileUrl
```

---

## Deployment

The full infrastructure is provisioned and configured by `deployAWS.sh`. Run locally via:

```bash
bash aws.sh
```

See [Deployment Guide](../Getting-Started/DEPLOYMENT.md) for full details.

