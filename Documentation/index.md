# Chatr — Technical Documentation

Chatr is a real-time messaging platform built on a Node.js/Express backend and Next.js frontend, communicating over REST and WebSocket (Socket.io). It supports direct messaging with message requests, friend management, presence tracking, file/image/audio/video uploads, voice calling, an embeddable support chat widget, and offline message queuing.

## Documentation Structure

| Section | Description |
|---------|-------------|
| [Architecture](./Architecture/index.md) | System design, component diagram, data flow |
| [AWS Infrastructure](./Architecture/AWS.md) | EC2, RDS, Redis, S3, Nginx — ports and config |
| [API Reference](./API/Rest_Api.md) | All REST endpoints, request/response schemas |
| [WebSocket](./WebSocket/Events.md) | Socket.io events, payloads, connection lifecycle |
| [Database](./Database/Schema.md) | Prisma schema, models, indexes, migrations |
| [Widget](./Widget/index.md) | Embeddable support chat widget — config, build, icons, API |
| [Admin](./Admin/index.md) | Widget contact management — admin panel, API endpoints, access control |
| [Features](./Features/Messaging.md) | Messaging, message requests, presence, friends |
| [Voice Calls](./Features/VOICE_CALLS.md) | WebRTC P2P voice calls — architecture, signaling, HTTPS setup |
| [Frontend](./Frontend/index.md) | Next.js structure, contexts, components |
| [Contexts](./Frontend/Contexts/index.md) | WebSocket, Theme, Toast, Confirmation, Panel, Presence, Call |
| [Hooks](./Frontend/Hooks/index.md) | `useAuth`, `useConversationList`, `useFriends`, `useConversation`, `useGroupMessageInput` |
| [Lib](./Frontend/Lib/index.md) | api.ts, db.ts, offline.ts, auth helpers, image services, messageCache |
| [Types](./Frontend/Types/index.md) | Shared TypeScript interfaces |
| [Demo Components](./Frontend/Components/Demo/index.md) | Dev/demo-only components — BottomSheetDemo, DemoPanels |
| [Backend](./Backend/index.md) | Backend overview, middleware, env vars |
| [Routes](./Backend/Routes.md) | Express route files — auth, users, messages, friends, conversations, dashboard |
| [Socket Handlers](./Backend/Socket_Handlers.md) | Socket.io event handlers, Redis presence, conversation-aware broadcasting |
| [Authentication](./Backend/Authentication.md) | JWT, SMS/email verification, 2FA |
| [Services](./Backend/Services.md) | Email (Mailtrap), SMS (SMS Works), Waveform |
| [File Upload](./Backend/File_Upload.md) | Multer config, upload flow, waveform strategy |
| [Middleware](./Backend/Middleware.md) | JWT auth middleware detail |
| [Deployment](./Getting-Started/Deployment.md) | AWS infrastructure, deploy script |
| [AWS Setup Guide](./Getting-Started/DEPLOY_AWS.md) | Step-by-step beginner walkthrough for provisioning AWS |
| [Getting Started](./Getting-Started/Local_Setup.md) | Local development setup |
| [Testing](./Testing/index.md) | Test suite, Jest config, coverage |
| [Presentation](./PRESENTATION.md) | Product narrative, architecture overview, and feature showcase |
| [Version History](./VERSION.md) | Version history and release notes |
| [Glossary](./GLOSSARY.md) | Definitions of technical terms used throughout the docs |
| [Factory: TURN Server](./Factory/TURN_SERVER.md) | Step-by-step guide to provisioning a Coturn TURN server on AWS |

## Quick Reference

- **Frontend**: `https://localhost:3000`
- **Dashboard**: `https://localhost:3002/dashboard` (website — separate repo)
- **Backend API**: `http://localhost:3001` (internal) / `https://localhost:3002` (browser)
- **WebSocket**: `ws://localhost:3001` / `wss://localhost:3002`
- **Swagger UI**: `http://localhost:3001/api/docs`
- **Health Check**: `http://localhost:3001/api/health`
- **Prisma Studio**: `http://127.0.0.1:5555`
- **Database**: PostgreSQL via Prisma ORM
- **Cache/Presence**: Redis
- **File Storage**: Local (`/uploads`) → S3 in production (50MB limit)
- **Widget**: `http://localhost:3001/widget/chatr.js`

## Voice Calls *(not production ready)*

1-to-1 WebRTC P2P voice calling over Socket.IO signaling. Audio travels directly between peers — the server only handles call setup.

| | |
|---|---|
| **Full documentation** | [Features → Voice Calls](./Features/VOICE_CALLS.md) |
| **Socket events** | [WebSocket → Voice Call Events](./WebSocket/Events.md#voice-call-events) |
| **Database model** | [Database → Call](./Database/Schema.md#call) |
| **Frontend context** | [Contexts → CallContext](./Frontend/Contexts/index.md#callcontext) |

**How it works:** Caller taps the phone icon → `call:initiate` → receiver sees full-screen overlay → `call:accept` → WebRTC peer connection established → P2P audio streams. Calls auto-miss after 30s. Disconnects are cleaned up server-side.

**Key files:** `CallContext.tsx` (state + WebRTC), `CallOverlay.tsx` (UI), `handlers.ts` (signaling), `schema.prisma` (Call model)

**Requires HTTPS** for microphone access. Dev setup uses mkcert certificates — see the [HTTPS section](./Features/VOICE_CALLS.md#https-requirement) for details.

## Recent Additions

- **Admin Panel**: Resizable split-panel UI at `/app/admin` for managing widget chat contacts — view conversations, delete guests, role-gated via `isSupport` flag. Accessible from the burger menu for admin users. Backend returns empty arrays (not 500s) when no contacts exist. 13 backend + 8 frontend tests.
- **Widget Icon Overhaul**: Core UI icons (chat, send, attach, play, pause) are now inline SVG `data:` URIs instead of external files, fixing Safari rendering failures on HTTPS pages with self-signed certificates
- **Profile Image Sync**: `BottomNav` uses a three-tier fallback (IndexedDB → UserSettingsContext → localStorage) for the profile avatar, and `syncProfileImageFromServer` dispatches `profileImageUpdated` events so all listening components refresh immediately
- **Deploy Script Robustness**: `SSH_OPTS` in `deployAWS.sh` changed from a string to a bash array to correctly handle PEM key paths containing spaces
- **Automated Admin Screenshots**: Playwright captures `44-admin-empty.png` and `45-admin-contacts.png` at 600×450 @2x for the marketing website's features page
- **Voice Calls** *(not production ready)*: 1-to-1 WebRTC P2P voice calling with Socket.IO signaling, full-screen call overlay, mute toggle, call history persistence, and HTTPS dev setup for iOS microphone access
- **Dedicated Login Page**: `/login` provides a standalone login and registration form with email/SMS verification — the app no longer includes marketing content (the website lives in a separate `chatr-website` repository)
- **Profile Management Overhaul**: Profile panel fetches fresh data on every view (multi-device support), uses direct HTTP instead of socketFirst, and shows save status indicators
- **socketFirst Reliability**: All contexts and hooks now gate WebSocket RPC calls on `connected` state, eliminating timeout cascades
- **E2E Test Coverage**: New registration and profile E2E tests covering user creation, email verification, display name, gender, avatar/cover image uploads, and data persistence
- **Image/Video Captions**: File uploads accept an optional `caption` field — text displayed above the media in the chat bubble
- **Resend Verification**: Users can resend email/SMS verification codes during login and registration
- **Developer Dashboard Metrics**: Code churn (hot files), commit streaks, lines added/deleted, stale files, code ownership per contributor, bundle size, branch/tag counts, untested components, Prisma schema complexity
- **CSS Modules Refactor**: Component-specific styles extracted from `globals.css` into co-located `.module.css` files
- **App Versioning**: Auto-incremented build version displayed on the dashboard, amended into each commit via post-commit hook
