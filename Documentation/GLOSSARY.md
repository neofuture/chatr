# Glossary

Technical terms used throughout the Chatr documentation.

---

## Authentication & Security

| Term | Definition |
|------|-----------|
| **2FA / TOTP** | Two-Factor Authentication using Time-based One-Time Passwords. Users scan a QR code with an authenticator app (e.g., Google Authenticator) and enter a 6-digit code at login. |
| **BASE32** | A text encoding for binary data using 32 characters. Used to encode TOTP shared secrets so they can be displayed and entered manually. |
| **Basic Auth** | HTTP authentication where credentials (username:password) are sent in the `Authorization` header. Used to protect Prisma Studio behind Nginx. |
| **Bearer Authentication** | An HTTP auth scheme where the client sends `Authorization: Bearer <token>`. Chatr uses this with JWTs for all API requests. |
| **bcryptjs** | A library for hashing passwords. Chatr uses 10 rounds of bcrypt hashing to store passwords securely. |
| **E.164** | The international phone number format with a country code prefix (e.g., `+44 7700 900000`). Used for SMS verification. |
| **HMAC** | Hash-based Message Authentication Code — a keyed hash used for verifying data integrity. Referenced in TURN short-lived credentials and JWT signing (HS256). |
| **HS256** | HMAC-SHA256 — the JWT signing algorithm Chatr uses. The server signs tokens with a secret key and verifies them on each request. |
| **htpasswd** | A file format and CLI tool (from `apache2-utils`) for storing hashed usernames/passwords. Used with Nginx Basic Auth. |
| **jsonwebtoken** | The Node.js library that creates and verifies JWTs in the Chatr backend. |
| **JWT** | JSON Web Token — a signed token containing user identity claims (`userId`, `username`). Used for API authentication and WebSocket identity. |
| **OTP** | One-Time Password — a single-use code sent via email or SMS for login verification. |
| **Rate Limiting** | Restricting the number of requests a client can make in a time window. Chatr uses Redis-backed rate limiting to prevent abuse of auth endpoints. |
| **Secure Context** | A browser security classification. Pages served over HTTPS (or localhost) are "secure" and can access sensitive APIs like `getUserMedia`. |
| **speakeasy** | A Node.js library for generating and verifying TOTP codes for two-factor authentication. |
| **Token Blacklisting** | Storing invalidated JWTs in Redis so they cannot be reused after logout. |

## AWS & Infrastructure

| Term | Definition |
|------|-----------|
| **AMI** | Amazon Machine Image — a template containing the OS and software for launching EC2 instances. Chatr uses Ubuntu 24.04 LTS. |
| **ASG** | Auto Scaling Group — automatically launches or terminates EC2 instances based on demand. Suggested for scaling TURN servers. |
| **Certbot** | A command-line tool that obtains and renews TLS certificates from Let's Encrypt automatically. |
| **CloudWatch** | AWS monitoring service for metrics (CPU, memory, network), logs, and alarms on EC2 and other services. |
| **Coturn** | Open-source TURN/STUN server software. Used in the TURN factory guide for relaying WebRTC media. |
| **EC2** | Amazon Elastic Compute Cloud — the virtual server that runs the Chatr backend and frontend in production. |
| **Elastic IP** | A static public IPv4 address in AWS. Associated with an EC2 instance so the IP doesn't change on reboot. |
| **ElastiCache** | AWS managed service for Redis (or Valkey). Chatr uses it for presence, caching, and rate limiting in production. |
| **gp3** | A general-purpose SSD volume type for AWS EBS storage. The default and recommended choice for EC2 and RDS. |
| **IAM** | AWS Identity and Access Management — controls who can access which AWS resources. Used to grant S3 upload permissions. |
| **Let's Encrypt** | A free Certificate Authority that issues TLS certificates. Used with Certbot for production HTTPS. |
| **Nginx** | A reverse proxy server that handles TLS termination, gzip compression, and routing for the production deployment. |
| **PM2** | A Node.js process manager that keeps applications running, handles restarts, and supports cluster mode for multi-core scaling. |
| **RDS** | Amazon Relational Database Service — managed PostgreSQL instance used in production. |
| **RDS Parameter Group** | A configuration set for tuning database parameters like `max_connections` on RDS instances. |
| **Redis** | An in-memory data store used for rate limiting, verification code storage, token blacklisting, and presence tracking. |
| **Region** | An AWS geographic area (e.g., `eu-west-2` for London). All Chatr services run in the same region. |
| **Reverse Proxy** | A server (Nginx) that sits between clients and backend services, forwarding requests and handling TLS, compression, and caching. |
| **S3** | Amazon Simple Storage Service — object storage used in production for uploaded files (images, audio, video). Local development uses the filesystem (`/uploads`). |
| **Security Group** | A stateful firewall in AWS that controls inbound and outbound traffic to EC2, RDS, and ElastiCache instances. |
| **SSH / SCP** | Secure Shell (remote terminal access) and Secure Copy (file transfer). Used for deploying to and managing EC2 instances. |
| **Subnet** | A subdivision of a VPC's IP range. RDS and ElastiCache sit in private subnets not reachable from the internet. |
| **systemd** | The Linux init system that manages services. PM2 registers startup hooks with systemd so apps survive reboots. |
| **TLS Termination** | Decrypting HTTPS traffic at the reverse proxy (Nginx) so backend services receive plain HTTP. |
| **Valkey** | A Redis-compatible open-source engine offered as an ElastiCache option. |
| **VPC** | Virtual Private Cloud — an isolated network in AWS. Chatr's RDS and ElastiCache are in private VPC subnets. |

## Backend Libraries & Services

| Term | Definition |
|------|-----------|
| **AWS SDK v3** | The official AWS JavaScript SDK (`@aws-sdk/client-s3`, etc.) used for uploading files to S3. |
| **cheerio** | A server-side HTML parser for scraping and generating link previews. |
| **dotenv** | A library that loads environment variables from `.env` files into `process.env`. |
| **Express / Express.js** | A minimal Node.js HTTP framework. Chatr's REST API and Socket.IO server run on a single Express app. |
| **express-validator** | Middleware for validating and sanitising incoming request data in Express routes. |
| **Helmet** | Express middleware that sets security-related HTTP headers (e.g., `X-Frame-Options`, `Content-Security-Policy`). |
| **ioredis** | A robust Node.js Redis client library used by the Chatr backend. |
| **Mailtrap** | An email API and testing service used for sending transactional emails (verification codes, password resets). |
| **Multer** | Express middleware for handling `multipart/form-data` file uploads. Saves files to disk or S3. |
| **music-metadata** | A library for reading audio file metadata (duration, format) from uploaded voice notes. |
| **Node.js** | A JavaScript runtime for server-side code. Chatr runs on Node.js 20. |
| **qrcode** | A library for generating QR code images. Used to produce the QR code during 2FA setup. |
| **Sharp** | A high-performance image processing library for resizing, cropping, and converting uploaded images on the server. |
| **SMS Works** | A UK-based SMS gateway API used for sending OTP verification codes via text message. |
| **supertest** | An HTTP assertion library for integration testing Express applications without starting a real server. |
| **swagger-jsdoc** | Generates OpenAPI/Swagger specifications from JSDoc comments in route files. |

## Database & Prisma

| Term | Definition |
|------|-----------|
| **Cascade (`onDelete: Cascade`)** | A referential action where deleting a parent record automatically deletes all dependent child records. |
| **Connection Pool** | A fixed set of reusable database connections managed by Prisma, avoiding the overhead of opening a new connection per query. Configured via `DATABASE_POOL_SIZE`. |
| **Foreign Key (FK)** | A column that references a primary key in another table, enforcing a relationship between two models. |
| **Index (`@@index`)** | A database structure (B-tree) that speeds up queries on frequently filtered or sorted columns. |
| **JSON Column** | A PostgreSQL column storing structured JSON data (e.g., `audioWaveform`, `linkPreview`). |
| **Migration** | A versioned SQL change generated by `prisma migrate` that evolves the database schema over time. Stored in `prisma/migrations/`. |
| **ORM** | Object-Relational Mapping — a pattern (implemented by Prisma) that maps database tables to application objects. |
| **PostgreSQL** | An open-source relational database (v16). Chatr's primary data store for users, messages, conversations, and calls. |
| **Prisma** | A TypeScript ORM that generates type-safe database queries from a schema file. Chatr uses Prisma with PostgreSQL. |
| **Prisma Studio** | A web-based GUI for browsing and editing database records. Runs on `http://127.0.0.1:5555` in development. |
| **Soft Delete** | Marking a record as deleted (via `deletedAt` timestamp) instead of physically removing it. Used for messages. |
| **Unique Constraint** | A rule enforcing that a column or combination of columns contains no duplicate values (e.g., `email`, `username`). |
| **UUID** | Universally Unique Identifier — a 128-bit ID used as the primary key for most Chatr models. Generated by `@default(uuid())`. |

## Development Tools & Workflow

| Term | Definition |
|------|-----------|
| **Coverage / lcov** | A metric showing what percentage of code (statements, branches, functions) is exercised by tests. Output as lcov reports. |
| **Cron** | A Linux scheduler for running tasks at fixed intervals. Used for automatic TLS certificate renewal. |
| **Docker / Docker Compose** | Containerisation tools. Chatr uses Docker Compose to run PostgreSQL and Redis locally during development. |
| **E2E (End-to-End) Test** | A test that exercises the full application stack (browser → frontend → backend → database) using Playwright. |
| **Environment Variables** | Configuration values (e.g., `DATABASE_URL`, `JWT_SECRET`) loaded from `.env` files or the host environment. |
| **ESLint** | A JavaScript/TypeScript linter that enforces code style and catches common errors. |
| **Husky** | A Git hooks manager that runs linting and tests before commits. |
| **Integration Test** | A test that exercises multiple layers together (e.g., Express routes + database mocks) using Jest and supertest. |
| **Jest** | A JavaScript testing framework used for unit and integration tests in both frontend and backend. |
| **Monorepo** | A single repository containing multiple projects (`frontend/`, `backend/`, `widget-src/`) with shared tooling. |
| **Playwright** | A browser automation framework used for end-to-end (E2E) testing. |
| **Pre-commit Hook** | A Git hook (managed by Husky) that runs linting and tests before allowing a commit. Prevents broken code from entering the repo. |
| **Storybook** | A UI development tool for building and testing components in isolation. |
| **Swagger / OpenAPI** | A specification for documenting REST APIs. The backend serves interactive API docs at `/api/docs`. |
| **Test Mode** | A backend flag (`TEST_MODE=true`) that suppresses real SMS/email sending and enables test cleanup endpoints for E2E tests. |
| **ts-jest** | A Jest transformer that compiles TypeScript test files on the fly. |
| **tsx** | A TypeScript runner used in the backend `dev` script for fast reloading without a separate compile step. |
| **Turbopack** | Next.js's Rust-based bundler for faster development builds (used with `next dev`). |
| **Unit Test** | A test that exercises a single function or module in isolation, typically with mocked dependencies. |
| **Vite** | A fast JavaScript bundler used by Storybook's React setup. |

## Frontend

| Term | Definition |
|------|-----------|
| **App Router** | Next.js's file-based routing system under `src/app/`. Each folder becomes a route; `page.tsx` defines the page component. |
| **Blob** | A binary large object in the browser, representing raw file data (images, audio) before upload. |
| **CSS Custom Properties** | CSS variables (e.g., `--color-primary`) used for theming alongside CSS Modules. |
| **CSS Modules** | A CSS scoping technique where class names are locally scoped to the importing component, preventing style collisions. Files use the `.module.css` extension. |
| **Framer Motion** | An animation library for React. Used for transitions, bottom sheet gestures, and UI motion. |
| **Hydration** | The process where React attaches event handlers to server-rendered HTML on the client. Mismatches can occur with theme or browser-only values. |
| **IndexedDB / Dexie** | A browser-side database (IndexedDB) accessed via the Dexie library. Used for offline message caching and local image storage. |
| **jsdom** | An in-memory browser DOM implementation used by Jest for running component tests outside a real browser. |
| **localStorage** | Browser key-value storage used for persisting auth tokens, theme preference, and widget session data. |
| **Mermaid** | A text-based diagram syntax (flowcharts, sequence diagrams, state diagrams) rendered in the docs UI via a custom component. |
| **next/dynamic** | A Next.js function for lazy-loading components. Used with `{ ssr: false }` for client-only components like Mermaid diagrams. |
| **Next.js** | A React framework providing server-side rendering, file-based routing, API routes, and build optimisation. Chatr's frontend runs on Next.js. |
| **PWA** | Progressive Web App — a web application installed to the home screen that behaves like a native app. Chatr supports PWA installation on iOS and Android. |
| **React** | A JavaScript UI library for building component-based interfaces. Chatr uses React 19. |
| **React Context** | A React mechanism for sharing state across a component tree without prop drilling. Chatr uses contexts for WebSocket, calls, theme, toasts, and more. |
| **React Testing Library** | A testing utility that encourages testing components through user interactions and DOM assertions rather than implementation details. |
| **react-markdown** | A React component that renders Markdown content as HTML. Used in the documentation viewer. |
| **Rewrites (`next.config`)** | Next.js configuration that proxies certain URL paths (e.g., `/uploads/*`) to the backend without exposing them as separate origins. |
| **Safe Area Insets** | CSS environment variables (`env(safe-area-inset-top)`, etc.) that account for device hardware (notch, home indicator) when rendering PWA content edge-to-edge. |
| **SSR** | Server-Side Rendering — generating HTML on the server before sending it to the browser. Next.js uses SSR by default. |
| **TypeScript** | A typed superset of JavaScript used across the entire Chatr codebase for compile-time type safety. |

## Messaging & Real-time Patterns

| Term | Definition |
|------|-----------|
| **Ghost Typing** | A live preview of the message being composed, transmitted character-by-character over the socket to the recipient. |
| **Message Request** | A pending conversation from a non-friend. The recipient must accept before messages are fully exchanged. |
| **Offline Queue** | Messages composed while disconnected are stored in IndexedDB and automatically sent when the connection resumes. |
| **Presence** | Online/offline/away status of users, tracked via Socket.IO connections and stored in Redis. |
| **Read Receipt** | A marker indicating that a recipient has seen a message. Transmitted via Socket.IO and stored per-message. |
| **RPC (Remote Procedure Call)** | A request/response pattern over Socket.IO where the client emits an event and awaits a callback reply. Used by `socketRPC` as a faster alternative to REST. |
| **socketFirst** | A Chatr pattern that tries a Socket.IO RPC first and falls back to a REST API call if the socket is disconnected. |
| **Sticky Sessions** | Load-balancer affinity that routes a client's requests to the same server. Required when scaling Socket.IO across multiple PM2 workers with the Redis adapter. |
| **Typing Indicator** | A real-time signal that a user is composing a message, broadcast via Socket.IO to conversation participants. |

## Media & Audio

| Term | Definition |
|------|-----------|
| **AnalyserNode** | A Web Audio API node that provides real-time frequency/time-domain data, used for waveform visualisation during voice recording. |
| **MediaRecorder** | A browser API for recording audio/video from a media stream. Outputs WebM/Opus on Chromium and MP4/AAC on Safari. |
| **MIME Type** | A label identifying a file's format (e.g., `image/jpeg`, `audio/webm`). Used for upload validation and content-type headers. |
| **multipart/form-data** | An HTTP encoding for file uploads. Multer parses this format on the backend. |
| **OfflineAudioContext** | A Web Audio API that decodes audio buffers without playing them, used for extracting waveform data from uploaded voice notes. |
| **Open Graph** | HTML meta tags (`og:title`, `og:image`, etc.) that define how a URL appears when shared. Used for link preview generation. |
| **WebM / Opus** | A media container (WebM) and audio codec (Opus) used by Chromium browsers for voice recording. Safari uses MP4/AAC instead. |

## Networking & Protocols

| Term | Definition |
|------|-----------|
| **CORS** | Cross-Origin Resource Sharing — HTTP headers that control which origins can make requests to the backend. |
| **gzip** | A compression algorithm. Nginx compresses HTTP responses with gzip to reduce transfer sizes. |
| **HSTS** | HTTP Strict Transport Security — a browser mechanism that forces HTTPS for a domain. Can interfere with HTTP-only local tools like Prisma Studio. |
| **HTTP Long-Polling** | A transport fallback where the client holds an HTTP request open until the server has data to send. Socket.IO uses this when WebSockets are unavailable. |
| **HTTPS / TLS** | Hypertext Transfer Protocol Secure — HTTP encrypted with TLS. Required by browsers for WebRTC's `getUserMedia` (microphone/camera access). |
| **ICE** | Interactive Connectivity Establishment — the protocol WebRTC uses to discover a working network path between two peers by testing candidate addresses (local, STUN-derived, and TURN-relayed). *In plain terms:* trying every possible route between two browsers until one works, like testing every key on a keyring. |
| **ICE Candidate** | A potential network address (IP + port + protocol) that a peer offers as a connection endpoint. Candidates are exchanged via the signaling server and tested in pairs. |
| **JSON** | JavaScript Object Notation — a lightweight text format for structured data. Used for all API request/response bodies. |
| **mDNS / Bonjour** | Multicast DNS — allows devices on a local network to resolve `.local` hostnames without a DNS server. Used for LAN testing (e.g., `machinename.local:3000`). |
| **mkcert** | A tool that creates locally-trusted TLS certificates for development. Used by Chatr to enable HTTPS on `localhost` and LAN hostnames. |
| **NAT** | Network Address Translation — a router feature that maps private IPs to a shared public IP. NAT traversal is the main challenge ICE solves. *In plain terms:* your router hides your device behind a single public address, like an apartment building with one street address but many units inside. |
| **REST** | Representational State Transfer — an architectural style for HTTP APIs using standard methods (GET, POST, PUT, DELETE) on resource URLs. Chatr's API follows REST conventions at `/api/*`. |
| **SDP** | Session Description Protocol — a text format describing media capabilities (codecs, encryption, ICE candidates). Exchanged as "offer" and "answer" during WebRTC call setup. |
| **Signaling** | The process of exchanging SDP offers/answers and ICE candidates between peers. Chatr uses Socket.IO as the signaling transport. |
| **Socket.IO** | A real-time event-driven library built on WebSockets with automatic reconnection and fallback to HTTP long-polling. Used for messaging, presence, and call signaling. |
| **STUN** | Session Traversal Utilities for NAT — a lightweight server that tells a client its public IP and port, enabling connections through NATs. Chatr uses Google's public STUN servers. *In plain terms:* asking "what's my public address?" so the other person knows where to reach you. |
| **Symmetric NAT** | A strict NAT type that assigns a different public port for each destination, preventing server-reflexive candidates from working. Requires a TURN relay. |
| **Trickle ICE** | The process of sending ICE candidates incrementally as they are discovered, rather than waiting to gather all of them first. |
| **TURN** | Traversal Using Relays around NAT — a relay server that forwards media when direct peer-to-peer connections are impossible (e.g., symmetric NATs). Not yet configured in Chatr. *In plain terms:* a courier that carries audio between two people when no direct route exists. |
| **TURN REST API** | A credential scheme where the backend generates time-limited HMAC tokens for TURN authentication, avoiding hardcoded passwords. |
| **WebRTC** | Web Real-Time Communication — a browser API for peer-to-peer audio, video, and data transfer without plugins. Chatr uses it for voice calls. |
| **WebSocket** | A persistent, full-duplex TCP connection between browser and server. Socket.IO uses WebSockets as its primary transport. |
| **WSS** | WebSocket Secure — WebSocket connections encrypted with TLS (`wss://`), analogous to HTTPS for HTTP. |

## WebRTC Specifics

| Term | Definition |
|------|-----------|
| **getUserMedia** | A browser API that requests access to the microphone and/or camera. Requires a secure context (HTTPS or localhost). |
| **Host Candidate** | An ICE candidate from a local network interface (e.g., `192.168.0.22:50000`). Works when both peers are on the same LAN. |
| **Media Stream** | An object containing audio (and optionally video) tracks captured from `getUserMedia`. Tracks are added to the peer connection for transmission. |
| **Offer / Answer** | The two-step SDP exchange: the caller creates an "offer" describing their capabilities, the receiver responds with an "answer" confirming the intersection of capabilities. |
| **Peer Connection** | A WebRTC connection between two browsers. Chatr creates one per active call and tears it down on hangup. |
| **Relay Candidate** | An ICE candidate allocated by a TURN server. Used as a last resort when direct connections fail. |
| **RTCPeerConnection** | The core WebRTC browser API that manages ICE negotiation, SDP exchange, and media streaming between two peers. |
| **Server-Reflexive (srflx) Candidate** | An ICE candidate discovered via STUN — the peer's public IP and port as seen from outside the NAT. The most commonly used candidate type. |

## Widget

| Term | Definition |
|------|-----------|
| **IIFE** | Immediately Invoked Function Expression — a JavaScript pattern where a function runs as soon as it's defined. The Chatr widget bundles as an IIFE so it can be dropped into any page without module system dependencies. |
| **Terser** | A JavaScript minifier used to compress the widget bundle for production. |
