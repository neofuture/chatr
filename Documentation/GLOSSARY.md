# Glossary

Technical terms used throughout the Chatr documentation.

---

## Networking & Protocols

| Term | Definition |
|------|-----------|
| **WebRTC** | Web Real-Time Communication — a browser API for peer-to-peer audio, video, and data transfer without plugins. Chatr uses it for voice calls. |
| **ICE** | Interactive Connectivity Establishment — the protocol WebRTC uses to discover a working network path between two peers by testing candidate addresses (local, STUN-derived, and TURN-relayed). *In plain terms:* trying every possible route between two browsers until one works, like testing every key on a keyring. |
| **ICE Candidate** | A potential network address (IP + port + protocol) that a peer offers as a connection endpoint. Candidates are exchanged via the signaling server and tested in pairs. |
| **STUN** | Session Traversal Utilities for NAT — a lightweight server that tells a client its public IP and port, enabling connections through NATs. Chatr uses Google's public STUN servers. *In plain terms:* asking "what's my public address?" so the other person knows where to reach you. |
| **TURN** | Traversal Using Relays around NAT — a relay server that forwards media when direct peer-to-peer connections are impossible (e.g., symmetric NATs). Not yet configured in Chatr. *In plain terms:* a courier that carries audio between two people when no direct route exists. |
| **NAT** | Network Address Translation — a router feature that maps private IPs to a shared public IP. NAT traversal is the main challenge ICE solves. *In plain terms:* your router hides your device behind a single public address, like an apartment building with one street address but many units inside. |
| **Symmetric NAT** | A strict NAT type that assigns a different public port for each destination, preventing server-reflexive candidates from working. Requires a TURN relay. |
| **SDP** | Session Description Protocol — a text format describing media capabilities (codecs, encryption, ICE candidates). Exchanged as "offer" and "answer" during WebRTC call setup. |
| **Signaling** | The process of exchanging SDP offers/answers and ICE candidates between peers. Chatr uses Socket.IO as the signaling transport. |
| **Socket.IO** | A real-time event-driven library built on WebSockets with automatic reconnection and fallback to HTTP long-polling. Used for messaging, presence, and call signaling. |
| **WebSocket** | A persistent, full-duplex TCP connection between browser and server. Socket.IO uses WebSockets as its primary transport. |
| **CORS** | Cross-Origin Resource Sharing — HTTP headers that control which origins can make requests to the backend. |
| **HTTPS / TLS** | Hypertext Transfer Protocol Secure — HTTP encrypted with TLS. Required by browsers for WebRTC's `getUserMedia` (microphone/camera access). |
| **mkcert** | A tool that creates locally-trusted TLS certificates for development. Used by Chatr to enable HTTPS on `localhost` and LAN hostnames. |
| **mDNS / Bonjour** | Multicast DNS — allows devices on a local network to resolve `.local` hostnames without a DNS server. Used for LAN testing (e.g., `machinename.local:3000`). |
| **HSTS** | HTTP Strict Transport Security — a browser mechanism that forces HTTPS for a domain. Can interfere with HTTP-only local tools like Prisma Studio. |

## WebRTC Specifics

| Term | Definition |
|------|-----------|
| **RTCPeerConnection** | The core WebRTC browser API that manages ICE negotiation, SDP exchange, and media streaming between two peers. |
| **getUserMedia** | A browser API that requests access to the microphone and/or camera. Requires a secure context (HTTPS or localhost). |
| **Offer / Answer** | The two-step SDP exchange: the caller creates an "offer" describing their capabilities, the receiver responds with an "answer" confirming the intersection of capabilities. |
| **Peer Connection** | A WebRTC connection between two browsers. Chatr creates one per active call and tears it down on hangup. |
| **Media Stream** | An object containing audio (and optionally video) tracks captured from `getUserMedia`. Tracks are added to the peer connection for transmission. |

## Backend & Infrastructure

| Term | Definition |
|------|-----------|
| **Prisma** | A TypeScript ORM that generates type-safe database queries from a schema file. Chatr uses Prisma with PostgreSQL. |
| **Prisma Studio** | A web-based GUI for browsing and editing database records. Runs on `http://127.0.0.1:5555` in development. |
| **JWT** | JSON Web Token — a signed token containing user identity claims (`userId`, `username`). Used for API authentication and WebSocket identity. |
| **Redis** | An in-memory data store used for rate limiting, verification code storage, token blacklisting, and presence tracking. |
| **S3** | Amazon Simple Storage Service — object storage used in production for uploaded files (images, audio, video). Local development uses the filesystem (`/uploads`). |
| **EC2** | Amazon Elastic Compute Cloud — the virtual server that runs the Chatr backend and frontend in production. |
| **RDS** | Amazon Relational Database Service — managed PostgreSQL instance used in production. |
| **Nginx** | A reverse proxy server that handles TLS termination, gzip compression, and routing for the production deployment. |
| **ORM** | Object-Relational Mapping — a pattern (implemented by Prisma) that maps database tables to application objects. |

## Frontend

| Term | Definition |
|------|-----------|
| **Next.js** | A React framework providing server-side rendering, file-based routing, API routes, and build optimisation. Chatr's frontend runs on Next.js. |
| **React Context** | A React mechanism for sharing state across a component tree without prop drilling. Chatr uses contexts for WebSocket, calls, theme, toasts, and more. |
| **PWA** | Progressive Web App — a web application installed to the home screen that behaves like a native app. Chatr supports PWA installation on iOS and Android. |
| **Safe Area Insets** | CSS environment variables (`env(safe-area-inset-top)`, etc.) that account for device hardware (notch, home indicator) when rendering PWA content edge-to-edge. |
| **IndexedDB / Dexie** | A browser-side database (IndexedDB) accessed via the Dexie library. Used for offline message caching and local image storage. |
| **CSS Modules** | A CSS scoping technique where class names are locally scoped to the importing component, preventing style collisions. Files use the `.module.css` extension. |

## Authentication & Security

| Term | Definition |
|------|-----------|
| **2FA / TOTP** | Two-Factor Authentication using Time-based One-Time Passwords. Users scan a QR code with an authenticator app (e.g., Google Authenticator) and enter a 6-digit code at login. |
| **OTP** | One-Time Password — a single-use code sent via email or SMS for login verification. |
| **Secure Context** | A browser security classification. Pages served over HTTPS (or localhost) are "secure" and can access sensitive APIs like `getUserMedia`. |
| **Token Blacklisting** | Storing invalidated JWTs in Redis so they cannot be reused after logout. |

## Messaging

| Term | Definition |
|------|-----------|
| **Message Request** | A pending conversation from a non-friend. The recipient must accept before messages are fully exchanged. |
| **Presence** | Online/offline/away status of users, tracked via Socket.IO connections and stored in Redis. |
| **Read Receipt** | A marker indicating that a recipient has seen a message. Transmitted via Socket.IO and stored per-message. |
| **Typing Indicator** | A real-time signal that a user is composing a message, broadcast via Socket.IO to conversation participants. |
| **Offline Queue** | Messages composed while disconnected are stored in IndexedDB and automatically sent when the connection resumes. |

## Development Tools

| Term | Definition |
|------|-----------|
| **Jest** | A JavaScript testing framework used for unit and integration tests in both frontend and backend. |
| **Playwright** | A browser automation framework used for end-to-end (E2E) testing. |
| **Storybook** | A UI development tool for building and testing components in isolation. |
| **Husky** | A Git hooks manager that runs linting and tests before commits. |
| **Swagger / OpenAPI** | A specification for documenting REST APIs. The backend serves interactive API docs at `/api/docs`. |
| **Turbopack** | Next.js's Rust-based bundler for faster development builds (used with `next dev`). |
