# System Architecture

## Overview

Chatr is a three-tier real-time messaging platform: a Next.js 15 client, an Express 4 API server, and a PostgreSQL 16 database. Real-time communication runs over Socket.io on the same Express process. File uploads are stored locally (`/uploads`) in development and on AWS S3 in production. Presence and session state are managed in Redis.

## High-Level Architecture

```mermaid
graph TB
    subgraph CLIENT
        direction LR
        CT["Next.js 15 · React 19 · TypeScript"]
        Pages["Pages<br/>/app/*"]
        Contexts["Contexts<br/>WS · Theme · Toast · Panel"]
        Components["Components<br/>UI Layer"]
        IDB["IndexedDB<br/>Offline Queue"]
    end

    subgraph SERVER
        direction LR
        ST["Express.js · Node.js 20 · TypeScript"]
        REST["REST<br/>/api/*"]
        WS["Socket.io<br/>Handlers"]
        JWT["JWT<br/>Auth"]
        Multer["Multer<br/>Uploads"]
    end

    subgraph DATA["DATA LAYER — AWS"]
        direction LR
        PG["PostgreSQL<br/>Users · Messages · Groups"]
        Redis["Redis<br/>Presence · Online Users"]
        S3["S3<br/>Files · Audio · Images"]
    end

    CLIENT -->|"HTTP REST + WebSocket"| SERVER
    SERVER -->|"Prisma ORM"| PG
    SERVER -->|"ioredis"| Redis
    SERVER -->|"AWS SDK"| S3
```

## Technology Stack

### Frontend

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 15.x |
| UI Library | React | 19.x |
| Language | TypeScript | 5.x |
| Styling | CSS Modules + CSS custom properties | — |
| Real-time | Socket.io Client | 4.x |
| State Management | React Context API | — |
| Offline Storage | Dexie (IndexedDB wrapper) | 4.x |
| Animation | Framer Motion | 12.x |
| HTTP Client | Fetch API (native) | — |

### Backend

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20.x |
| Framework | Express.js | 4.x |
| Language | TypeScript | 5.x |
| Real-time | Socket.io | 4.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL | 16.x |
| Cache / Presence | Redis (ioredis) | 7.x |
| Auth | JWT (jsonwebtoken, HS256) | 9.x |
| File Upload | Multer | 1.x |
| Password Hashing | bcryptjs (10 rounds) | — |
| 2FA | speakeasy (TOTP) | — |
| SMS | Twilio | — |
| Email | Nodemailer | — |
| API Docs | Swagger UI + swagger-jsdoc | — |

### Infrastructure (Production)

| Service | AWS Product | Spec |
|---------|------------|------|
| App Server | EC2 | t3.small, Ubuntu 24.04 |
| Database | RDS PostgreSQL | db.t3.micro, pg16 |
| Cache | ElastiCache Redis | cache.t3.micro |
| File Storage | S3 | Standard |
| Reverse Proxy | Nginx | on EC2 |
| Process Manager | PM2 | on EC2 |
| SSL | Let's Encrypt (Certbot) | — |

## Request Lifecycle

### REST Request

```mermaid
sequenceDiagram
    participant B as Browser
    participant N as Nginx
    participant E as Express
    participant J as JWT Middleware
    participant R as Route Handler
    participant P as Prisma
    participant DB as PostgreSQL

    B->>N: HTTPS request
    N->>E: proxy_pass :3001
    E->>J: authenticateToken middleware
    J-->>E: req.user = { userId, username }
    E->>R: route handler
    R->>P: prisma.model.operation()
    P->>DB: SQL query
    DB-->>P: result rows
    P-->>R: typed objects
    R-->>B: JSON response
```

### WebSocket Connection & Messaging

```mermaid
sequenceDiagram
    participant S as Sender
    participant SV as Socket.io Server
    participant R as Recipient
    participant DB as PostgreSQL

    S->>SV: connect (auth: { token })
    SV->>SV: verify JWT → socket.userId
    SV->>SV: socket.join("user:{userId}")
    SV-->>S: presence:update (online user list)
    SV-->>R: user:status (online)

    S->>SV: message:send { recipientId, content, type }
    SV->>DB: prisma.message.create()
    SV-->>R: message:received { id, content, status: "delivered" }
    SV-->>S: message:sent { id, status }

    R->>SV: message:read "messageId"
    SV->>DB: update status = "read"
    SV-->>S: message:status { status: "read" }
```

### File Upload Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as Express REST
    participant DB as PostgreSQL
    participant SV as Socket.io
    participant R as Recipient

    C->>API: POST /api/messages/upload (multipart)
    API->>API: Multer saves file to disk/S3
    API->>DB: prisma.message.create (fileUrl, type)
    API-->>C: "{ messageId, fileUrl, needsWaveformGeneration }"
    C->>SV: message:send { messageId, recipientId }
    SV-->>R: message:received (with fileUrl)
    Note over C: Audio/Voice only
    C->>C: OfflineAudioContext decode
    C->>API: PATCH /api/messages/:id/waveform
    API->>DB: update audioWaveform, audioDuration
    API->>SV: emit audio:waveform to both users
```

## Directory Structure

```mermaid
graph TD
    chatr --> frontend
    chatr --> backend
    chatr --> prisma

    frontend --> fapp["app/<br/>pages + layouts"]
    frontend --> fcomponents["components/<br/>UI library"]
    frontend --> fcontexts["contexts/<br/>WS · Theme · Toast · Panel · Confirmation"]
    frontend --> fhooks["hooks/<br/>useAuth · useOfflineSync"]
    frontend --> flib["lib/<br/>api · auth · db · offline · imageServices"]
    frontend --> ftypes["types/<br/>User · Message · Group"]
    frontend --> futils["utils/<br/>extractWaveform"]

    fapp --> apppages["login · register · setup-2fa<br/>demo · docs · email-preview"]
    fapp --> appauth["app/ authenticated<br/>chat · settings · groups · updates · test"]

    fcomponents --> messaging["messaging/<br/>MessageBubble · AudioPlayer<br/>VoiceRecorder · ChatInput · ChatMessageList"]
    fcomponents --> formcontrols["form-controls/<br/>Button · Input · Select · Textarea<br/>Checkbox · Radio · DatePicker · Calendar<br/>RangeSlider · DualRangeSlider"]
    fcomponents --> dialogs["dialogs/<br/>BottomSheet · ConfirmationDialog · Lightbox"]
    fcomponents --> imagemanip["image-manip/<br/>ProfileImage · CoverImage<br/>Uploader + Cropper"]
    fcomponents --> formcomps["forms/<br/>LoginForm · LoginVerification<br/>EmailVerification · ForgotPassword"]
    fcomponents --> panels["panels/<br/>PanelContainer · AuthPanel"]
    fcomponents --> layout["layout/<br/>MobileLayout · BackgroundBlobs"]
    fcomponents --> utility["utility/<br/>Logo · ThemeToggle · ToastContainer<br/>ConnectionIndicator · BurgerMenu<br/>WebSocketStatusBadge · RoutePreloader"]

    backend --> bsrc["src/"]
    bsrc --> bindexts["index.ts<br/>Express + Socket.io entry"]
    bsrc --> bmiddleware["middleware/<br/>auth.ts — JWT"]
    bsrc --> broutes["routes/<br/>auth · users · messages<br/>groups · file-upload · email-templates"]
    bsrc --> bsocket["socket/<br/>handlers.ts — all events + presence"]
    bsrc --> bservices["services/<br/>email · sms · waveform"]

    prisma --> schema["schema.prisma"]
    prisma --> migrations["migrations/"]
```

## Context Provider Tree

```mermaid
graph TD
    RootLayout --> ThemeProvider
    ThemeProvider --> ToastProvider
    ToastProvider --> ConfirmationProvider
    ConfirmationProvider --> PanelProvider
    PanelProvider --> WebSocketProvider
    WebSocketProvider --> PageContent["Page Content"]
```

## Authentication & Session Flow

```mermaid
flowchart TD
    A[User visits /app/*] --> B{localStorage has token + user?}
    B -- No --> C[Redirect to /]
    B -- Yes --> D[AppLayout mounts]
    D --> E[WebSocketProvider connects to Socket.io]
    E --> F{JWT valid?}
    F -- No --> G[connect_error → user redirected]
    F -- Yes --> H[socket.userId assigned]
    H --> I["socket joins user:userId room"]
    I --> J[presence:update sent to client]
```

---

## See Also

- [AWS Infrastructure](./AWS.md) — EC2, RDS, Redis, S3, Nginx ports and config
