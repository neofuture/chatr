# Chatr — AWS Deployment Guide

> Complete beginner-friendly walkthrough. Takes about 45–60 minutes.
> You need: an AWS account, your code in a Git repo (GitHub/GitLab/etc.), a terminal.

---

## What we're building

```
Internet
   │
   ▼
[EC2 t3.small]  ←── your app server (Ubuntu, Nginx, Node, PM2)
   ├── Frontend  :3000  (Next.js)
   └── Backend   :3001  (Express + Socket.io)
        │
        ├── [RDS PostgreSQL]   ← managed database
        ├── [ElastiCache Redis] ← managed cache
        └── [S3 Bucket]        ← file / audio uploads
```

---

## Part 1 — AWS Account Setup

### 1.1 Create an AWS account
1. Go to https://aws.amazon.com → **Create an AWS Account**
2. Enter your email, choose a password, pick **Personal** account
3. Add a credit card (you won't be charged much — a t3.small + RDS costs ~$30–40/month)
4. Choose **Basic Support** (free)
5. Sign in to the **AWS Console** at https://console.aws.amazon.com

### 1.2 Choose a region
- Top-right corner of the console — pick the region closest to you
- e.g. **eu-west-1** (Ireland), **us-east-1** (N. Virginia), **ap-southeast-2** (Sydney)
- **Write this down** — you'll use it everywhere

---

## Part 2 — Create an EC2 Instance (your app server)

### 2.1 Launch the instance
1. In the console search bar type **EC2** → click it
2. Click **Launch Instance** (orange button)
3. Fill in:
   - **Name**: `chatr-server`
   - **AMI**: Ubuntu Server 24.04 LTS (Free tier eligible) ✅
   - **Instance type**: `t3.small` (2 vCPU, 2GB RAM) — enough for development/early prod
   - **Key pair**: Click **Create new key pair**
     - Name: `chatr-key`
     - Type: RSA
     - Format: `.pem`
     - Click **Create** → it downloads `chatr-key.pem` to your Mac
4. **Network settings** → click **Edit**
   - VPC: leave default
   - Auto-assign public IP: **Enable**
   - Create security group named `chatr-sg` with these **inbound rules**:

| Type | Port | Source | Why |
|------|------|--------|-----|
| SSH  | 22   | My IP  | So you can SSH in |
| HTTP | 80   | Anywhere (0.0.0.0/0) | Web traffic |
| HTTPS | 443 | Anywhere | SSL traffic |
| Custom TCP | 3000 | Anywhere | (temp, remove after Nginx) |
| Custom TCP | 3001 | Anywhere | (temp, remove after Nginx) |

5. **Storage**: change to **20 GB** gp3
6. Click **Launch Instance**
7. Note your **Public IPv4 address** (e.g. `52.56.123.160`)

### 2.2 Move your key and SSH in
```bash
# On your Mac terminal:
mv ~/Downloads/chatr-key.pem ~/.ssh/
chmod 400 ~/.ssh/chatr-key.pem

# SSH into your server:
ssh -i ~/.ssh/chatr-key.pem ubuntu@52.56.123.160
```
You should see the Ubuntu welcome message. You're now on your server.

---

## Part 3 — Create RDS PostgreSQL (managed database)

### 3.1 Create the database
1. Console search → **RDS** → **Create database**
2. Choose:
   - **Standard Create**
   - Engine: **PostgreSQL** → version 16
   - Template: **Free tier** (for dev) or **Production** (for prod)
   - **DB instance identifier**: `chatr-db`
   - **Master username**: `chatr_user`
   - **Master password**: create a strong password, save it!
   - **DB instance class**: `db.t3.micro` (free tier) or `db.t3.small`
   - **Storage**: 20 GB gp2
   - **VPC**: same as EC2 (default VPC)
   - **Public access**: **No** (only EC2 can reach it)
   - **VPC security group**: Create new → name it `chatr-rds-sg`
3. Click **Create database** (takes ~5 minutes)
4. Once created, click the DB → note the **Endpoint** (e.g. `chatr-db.abc123xyz.us-east-1.rds.amazonaws.com`)

### 3.2 Allow EC2 to connect to RDS

> ⚠️ **Common error:** *"You may not specify a referenced group id for an existing IPv4 CIDR rule"*
> This happens because AWS created a default rule using a CIDR (`0.0.0.0/0`) on port 5432,
> and you can't add a security-group reference to the same port as a CIDR rule.
> **Fix: delete the old CIDR rule first, then add the SG reference.**

1. Console search → **EC2** → scroll down left sidebar to **Security Groups**
2. Find `chatr-rds-sg` (the one RDS created) and click it
3. Click the **Inbound rules** tab → **Edit inbound rules**
4. Look for any existing rule on port **5432** with a CIDR source like `0.0.0.0/0` or `x.x.x.x/x`
   - Click the **✕ Delete** button on that row to remove it
5. Now click **Add rule** and fill in:
   - **Type**: PostgreSQL
   - **Port**: 5432 (auto-filled)
   - **Source**: Custom → start typing `chatr-sg` and select it from the dropdown
     (this means "only allow connections from EC2 instances in chatr-sg")
6. Click **Save rules**

> 💡 **Can't find chatr-rds-sg?** RDS sometimes creates the SG with a random name.
> Go to **RDS** → click your database → **Connectivity & security** tab →
> click the security group link there — that takes you straight to the right one.

---

## Part 4 — Create ElastiCache Redis (managed cache)

1. Console search → **ElastiCache** → **Create cluster** (or **Get started**)
2. You'll see two options — choose **Node-based cluster**
   - (Serverless is easier but ~3x more expensive and overkill for chat)
3. Fill in:
   - **Cluster engine**: **Valkey** or **Redis OSS** (either works — Redis OSS is fine)
   - **Cluster mode**: **Disabled** (simpler, no sharding needed)
   - **Cluster name**: `chatr-redis`
   - **Location**: Amazon Cloud
   - **Engine version**: leave default (7.x)
   - **Port**: 6379
   - **Node type**: `cache.t3.micro` (cheapest, fine for dev/early prod)
   - **Number of replicas**: **0** (dev) or **1** (prod)
4. **Subnet group** → Create new:
   - Name: `chatr-redis-subnet`
   - VPC: select the **default VPC** (same one EC2 is in)
   - Select all available subnets
5. **Security** → Security groups: leave default for now (we'll fix it next)
6. Everything else: leave as defaults
7. Click **Create** (takes 3–5 minutes)
8. Once status shows **Available**, click the cluster → note the **Primary endpoint**
   e.g. `chatr-redis.abc123.ng.0001.use1.cache.amazonaws.com`
   > ⚠️ Copy the endpoint **without** the `:6379` port at the end — the script adds it

### 4.1 Allow EC2 to connect to Redis

The **Modify** button on ElastiCache is often greyed out. Don't use it — instead just edit the **default VPC security group** that ElastiCache is already attached to:

1. Console search → **EC2** → left sidebar → **Security Groups**
2. Look for a group called **default** — there will be one with VPC ID matching your default VPC
   - You can confirm it's the right one: Console search → **VPC** → **Your VPCs** → note the **VPC ID** of your default VPC, then match it in the Security Groups list
3. Click the **default** security group → **Inbound rules** tab → **Edit inbound rules**
4. Click **Add rule**:
   - **Type**: Custom TCP
   - **Port range**: 6379
   - **Source**: Custom → type `chatr-sg` → select it from the dropdown
5. Click **Save rules**

> 💡 This works because when ElastiCache was created it was placed in the default security group. You're simply adding a rule to that group to allow your EC2 in on port 6379.

> ⚠️ **If you see the CIDR conflict error** (same as RDS): delete the existing `0.0.0.0/0` rule on port 6379 first, then add the `chatr-sg` reference rule.

---

## Part 5 — Create S3 Bucket (file storage)

1. Console search → **S3** → **Create bucket**
2. Fill in:
   - **Bucket name**: `chatr-uploads-yourname` (must be globally unique, lowercase, no spaces)
   - **Region**: same as everything else
3. **Object Ownership**: leave as **ACLs disabled (recommended)** ✅ — this is the default, don't change it
4. **Block Public Access settings**: leave **Block all public access** ticked ✅ — don't change this either
5. Everything else: leave as defaults
6. Click **Create bucket**

### 5.1 Create an IAM user for the app to access S3
1. Console search → **IAM** → **Users** → **Create user**
2. Name: `chatr-app`
3. **Attach policies directly** → search and add:
   - `AmazonS3FullAccess` (or create a minimal policy for just your bucket)
4. Click **Create user**
5. Click the user → **Security credentials** → **Create access key**
   - Use case: **Application running outside AWS**
   - Note the **Access key ID** and **Secret access key** — you only see it once!

---

## Part 6 — Push your code to GitHub

If your code isn't in GitHub yet:
```bash
# On your Mac:
cd /path/to/chatr
git init  # if not already a repo
git add .
git commit -m "Initial commit"

# Create a repo on github.com then:
git remote add origin https://github.com/YOURNAME/chatr.git
git push -u origin main
```

---

## Part 7 — Run the deploy script

### 7.1 Edit the script first (on your Mac)
Open `deployAWS.sh` in the project root and fill in the config block at the top:

```bash
DOMAIN=""                    # Leave blank to use IP, or e.g. "chat.yourdomain.com"
REPO_URL="https://github.com/YOURNAME/chatr.git"
DB_HOST="chatr-db.abc123.us-east-1.rds.amazonaws.com"   # your RDS endpoint
DB_NAME="chatr"
DB_USER="chatr_user"
DB_PASSWORD="your-strong-db-password"
REDIS_HOST="chatr-redis.abc.cache.amazonaws.com"         # your ElastiCache endpoint
JWT_SECRET=""                # run this on your Mac: openssl rand -hex 32
S3_BUCKET="chatr-uploads-yourname"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
```

Also ensure the SSH config section at the top has the correct `SERVER_IP` and PEM key path.

### 7.2 Run from your Mac

The deploy script detects macOS and automatically SCPs itself to the server, then runs it remotely via SSH. No manual SSH required.

```bash
# Make executable (first time only)
chmod +x deployAWS.sh

# Deploy — runs on EC2 via SSH automatically
./deployAWS.sh
```

The PEM key (`Chatr-key.pem`) must be in the project root. The script sets its permissions to `600` automatically.

This will take about 5–10 minutes. You'll see step-by-step progress streamed back to your terminal.

---

## Part 8 — (Optional but recommended) Point a domain name

If you have a domain (e.g. from GoDaddy, Namecheap, Cloudflare):

1. Go to your domain registrar's DNS settings
2. Add these records:

| Type | Name | Value |
|------|------|-------|
| A | `@` or `chat` | `52.56.123.160` (your EC2 IP) |
| A | `api` | `52.56.123.160` |
| A | `www` | `52.56.123.160` |

3. Edit `deployAWS.sh` — set `DOMAIN="chat.yourdomain.com"` and re-run
4. Certbot will auto-get free SSL certificates from Let's Encrypt

---

## Part 9 — Increase RDS max_connections (recommended)

RDS defaults are conservative. For a chat app with many concurrent users, bump it:

1. Console → **RDS** → **Parameter groups** → **Create parameter group**
   - Family: `postgres16`
   - Name: `chatr-params`
   - Description: `Chatr custom params`
2. Click `chatr-params` → **Edit parameters**
3. Search for `max_connections` → set to `200` (or higher for larger instances)
4. Save changes
5. Go back to RDS → select your database → **Modify**
6. Under **DB parameter group**, change to `chatr-params`
7. Apply immediately (requires a reboot)

> **Rule of thumb:** Total Prisma connections across all PM2 processes should be ~50% of `max_connections`, leaving headroom for Prisma Studio, migrations, and monitoring.

---

## Part 10 — Updating the app after code changes

```bash
# On your Mac — push changes to GitHub:
git add . && git commit -m "my changes" && git push

# SSH into server and run:
ssh -i ~/.ssh/chatr-key.pem ubuntu@52.56.123.160

cd ~/chatr

# Pull latest code
git pull

# Rebuild backend
cd backend && npm ci --omit=dev && npm run build && npx prisma migrate deploy && cd ..

# Rebuild frontend
cd frontend && npm ci --omit=dev && npm run build && cd ..

# Restart with ecosystem config (cluster mode)
pm2 start ecosystem.config.cjs
```

---

## Useful server commands

```bash
pm2 status                  # see if processes are running
pm2 logs                    # live logs (all processes)
pm2 logs chatr-backend     # backend logs only
pm2 logs chatr-frontend    # frontend logs only
pm2 restart chatr-backend  # restart just the backend
pm2 monit                   # real-time dashboard

sudo systemctl status nginx  # check Nginx
sudo nginx -t                # test Nginx config
sudo systemctl reload nginx  # reload Nginx

# Database: connect to RDS directly from EC2
psql postgresql://chatr_user:PASSWORD@RDS_ENDPOINT:5432/chatr
```

---

## Costs (approximate, us-east-1)

| Service | Type | $/month |
|---------|------|---------|
| EC2 | t3.small | ~$15 |
| RDS | db.t3.micro | ~$15 |
| ElastiCache | cache.t3.micro | ~$12 |
| S3 | first 5GB | ~$0.10 |
| Data transfer | first 1GB | free |
| **Total** | | **~$42/month** |

> **Free tier**: If your AWS account is < 12 months old, EC2 t2.micro and RDS db.t3.micro are free for 750 hours/month — saving ~$30/month.

---

## Troubleshooting

**Script fails at `npm run build`**
```bash
cd ~/chatr/backend && npm run build  # see error
```

**"Connection refused" on port 3001**
```bash
pm2 logs chatr-backend --lines 50
```

**Database connection error**
- Check RDS security group allows port 5432 from EC2 security group
- Verify `DATABASE_URL` in `~/chatr/backend/.env`

**WebSocket not connecting**
- Nginx must proxy WebSocket `Upgrade` headers — the config in this script handles it
- Check browser console for the WS URL — it must match your `NEXT_PUBLIC_WS_URL`

**Out of memory (t3.micro)**
```bash
# Add swap space:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```








