# Chatr — Technical Documentation

Chatr is a real-time messaging platform built on a Node.js/Express backend and Next.js frontend, communicating over REST and WebSocket (Socket.io). It supports direct messaging with message requests, friend management, presence tracking, file/image/audio/video uploads, an embeddable support chat widget, and offline message queuing.

## Documentation Structure

| Section | Description |
|---------|-------------|
| [Architecture](./Architecture/index.md) | System design, component diagram, data flow |
| [AWS Infrastructure](./Architecture/AWS.md) | EC2, RDS, Redis, S3, Nginx — ports and config |
| [API Reference](./API/Rest_Api.md) | All REST endpoints, request/response schemas |
| [WebSocket](./WebSocket/Events.md) | Socket.io events, payloads, connection lifecycle |
| [Database](./Database/Schema.md) | Prisma schema, models, indexes, migrations |
| [Widget](./Widget/index.md) | Embeddable support chat widget — config, build, icons, API |
| [Features](./Features/MESSAGING.md) | Messaging, message requests, presence, friends |
| [Frontend](./Frontend/index.md) | Next.js structure, contexts, components |
| [Contexts](./Frontend/Contexts/index.md) | WebSocket, Theme, Toast, Confirmation, Panel, Presence |
| [Hooks](./Frontend/Hooks/index.md) | `useAuth`, `useConversationList`, `useFriends`, `useConversation`, `useGroupMessageInput` |
| [Lib](./Frontend/Lib/index.md) | api.ts, db.ts, offline.ts, auth helpers, image services, messageCache |
| [Types](./Frontend/Types/index.md) | Shared TypeScript interfaces |
| [Demo Components](./Frontend/Components/Demo/index.md) | Dev/demo-only components — Demo2FA, BottomSheetDemo, DemoPanels |
| [Backend](./Backend/index.md) | Backend overview, middleware, env vars |
| [Routes](./Backend/Routes.md) | Express route files — auth, users, messages, friends, conversations, dashboard |
| [Socket Handlers](./Backend/Socket_Handlers.md) | Socket.io event handlers, Redis presence, conversation-aware broadcasting |
| [Authentication](./Backend/Authentication.md) | JWT, SMS/email verification, 2FA |
| [Services](./Backend/Services.md) | Email (Mailtrap), SMS (SMS Works), Waveform |
| [File Upload](./Backend/File_Upload.md) | Multer config, upload flow, waveform strategy |
| [Middleware](./Backend/Middleware.md) | JWT auth middleware detail |
| [Deployment](./Getting-Started/Deployment.md) | AWS infrastructure, deploy script |
| [Getting Started](./Getting-Started/Local_Setup.md) | Local development setup |
| [Testing](./Testing/index.md) | Test suite, Jest config, coverage |

## Quick Reference

- **Frontend**: `http://localhost:3000`
- **Dashboard**: `http://localhost:3000/dashboard`
- **Backend API**: `http://localhost:3001`
- **WebSocket**: `ws://localhost:3001`
- **Swagger UI**: `http://localhost:3001/api/docs`
- **Health Check**: `http://localhost:3001/api/health`
- **Database**: PostgreSQL via Prisma ORM
- **Cache/Presence**: Redis
- **File Storage**: Local (`/uploads`) → S3 in production (50MB limit)
- **Widget**: `http://localhost:3001/widget/chatr.js`
