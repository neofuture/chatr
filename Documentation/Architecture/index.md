# System Architecture

## Overview

Chatr is a three-tier application: a Next.js client, an Express API server, and a PostgreSQL database. Real-time communication is handled by Socket.io running on the same Express process. File uploads are stored locally in development and on S3 in production.

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│  Next.js 15 (React 19, TypeScript)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Pages   │  │ Contexts │  │Components│  │  IndexedDB│  │
│  │ /app/*   │  │ WS/Theme │  │ UI Layer │  │  (offline)│  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │  HTTP REST  +  WebSocket (Socket.io)
┌──────────────────────▼──────────────────────────────────────┐
│                     API SERVER                              │
│  Express.js (Node.js, TypeScript)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │   REST   │  │ Socket.io│  │   JWT    │  │  Multer   │  │
│  │ /api/*   │  │ Handlers │  │  Auth    │  │  Uploads  │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
└──────────┬──────────────────────────────────────────────────┘
           │ Prisma ORM           │ ioredis
┌──────────▼──────────┐  ┌───────▼───────┐  ┌──────────────┐
│     PostgreSQL       │  │     Redis     │  │  S3 / Local  │
│  Users, Messages,    │  │   Presence,   │  │    Files,    │
│  Groups, Sessions    │  │   Sessions    │  │    Audio     │
└─────────────────────┘  └───────────────┘  └──────────────┘
```

## Technology Stack

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 15.x |
| UI | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | CSS Modules + Inline styles | — |
| Real-time | Socket.io Client | 4.x |
| State | React Context + Zustand | — |
| Offline | Dexie (IndexedDB) | 4.x |
| Animation | Framer Motion | 12.x |
| HTTP | Axios | 1.x |

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20.x |
| Framework | Express.js | 4.x |
| Language | TypeScript | 5.x |
| Real-time | Socket.io | 4.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16.x |
| Cache | Redis (ioredis) | 7.x |
| Auth | JWT (jsonwebtoken) | 9.x |
| File Upload | Multer | 1.x |
| Password | bcryptjs | — |
| 2FA | speakeasy | — |

### Infrastructure (Production)

| Service | AWS Product |
|---------|------------|
| App Server | EC2 t3.small (Ubuntu 24.04) |
| Database | RDS PostgreSQL (db.t3.micro) |
| Cache | ElastiCache Redis (cache.t3.micro) |
| File Storage | S3 |
| Reverse Proxy | Nginx |
| Process Manager | PM2 |
| SSL | Let's Encrypt (Certbot) |

## Request Lifecycle

### REST Request
```
Browser → Nginx → Express Router → JWT Middleware → Route Handler → Prisma → PostgreSQL
                                                                  ↓
                                                           Response JSON
```

### WebSocket Event
```
Browser (Socket.io Client)
  └─ connect (JWT in handshake)
       └─ handlers.ts auth middleware → validates JWT → socket.userId assigned
            └─ socket joins room: user:{userId}
                 └─ event received (e.g. message:send)
                      └─ handler → Prisma → DB → io.to(recipientRoom).emit(event)
```

### File Upload
```
Browser → multipart/form-data POST → Multer middleware → disk storage
       → Prisma saves message with fileUrl
       → Socket.io pushes message:received to recipient
       → [async] waveform extracted client-side → PATCH /api/messages/:id/waveform
       → Socket.io pushes audio:waveform to both users
```

## Directory Structure

```
chatr/
├── frontend/                    # Next.js application
│   └── src/
│       ├── app/                 # Next.js App Router pages
│       │   ├── (home)/          # Landing / auth pages
│       │   └── app/             # Authenticated app pages
│       │       ├── test/        # Developer test lab
│       │       └── docs/        # Documentation viewer
│       ├── components/          # Reusable UI components
│       ├── contexts/            # React contexts (WS, Theme, Toast)
│       ├── lib/                 # Utilities (auth, storage)
│       └── utils/               # Helper functions
│
├── backend/                     # Express API server
│   └── src/
│       ├── index.ts             # Server entry point
│       ├── routes/              # REST route handlers
│       │   ├── auth.ts          # Registration, login, verification
│       │   ├── users.ts         # User search, profiles
│       │   ├── messages.ts      # Message history, waveform
│       │   ├── groups.ts        # Group CRUD
│       │   └── file-upload.ts   # File/audio/image upload
│       ├── socket/
│       │   └── handlers.ts      # All Socket.io event handlers
│       ├── middleware/
│       │   └── auth.ts          # JWT authentication middleware
│       └── services/
│           └── waveform.ts      # Audio waveform utilities
│
└── prisma/
    ├── schema.prisma            # Database schema
    └── migrations/              # Migration history
```

