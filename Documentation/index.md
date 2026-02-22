# Chatr — Technical Documentation

Chatr is a real-time messaging platform built on a Node.js/Express backend and Next.js frontend, communicating over REST and WebSocket (Socket.io).

## Documentation Structure

| Section | Description |
|---------|-------------|
| [Architecture](./Architecture/index.md) | System design, component diagram, data flow |
| [AWS Infrastructure](./Architecture/AWS.md) | EC2, RDS, Redis, S3, Nginx — ports and config |
| [API Reference](./API/REST_API.md) | All REST endpoints, request/response schemas |
| [WebSocket](./WebSocket/EVENTS.md) | Socket.io events, payloads, connection lifecycle |
| [Database](./Database/SCHEMA.md) | Prisma schema, models, indexes, migrations |
| [Frontend](./Frontend/index.md) | Next.js structure, contexts, components |
| [Contexts](./Frontend/Contexts/index.md) | WebSocketContext, ThemeContext, ToastContext, ConfirmationContext, PanelContext |
| [Hooks](./Frontend/Hooks/index.md) | `useAuth`, `useOfflineSync`, `useConversation` |
| [Lib](./Frontend/Lib/index.md) | api.ts, db.ts, offline.ts, auth helpers, image services |
| [Types](./Frontend/Types/index.md) | Shared TypeScript interfaces |
| [Test Lab](./Frontend/Components/test/index.md) | Dev Test Lab components and `useConversation` hook |
| [Demo Components](./Frontend/Components/demo/index.md) | Dev/demo-only components — Demo2FA, WebSocketDemo, DemoPanels etc. |
| [Features](./Features/Messaging.md) | Messaging, voice, file upload, presence |
| [Backend](./Backend/index.md) | Backend overview, middleware, env vars |
| [Routes](./Backend/Routes.md) | All Express route files — auth, users, messages, groups, file upload |
| [Socket Handlers](./Backend/Socket_Handlers.md) | Socket.io event handlers, presence store, connection lifecycle |
| [Authentication](./Backend/Authentication.md) | JWT, SMS/email verification, 2FA |
| [Services](./Backend/SERVICES.md) | Email (Mailtrap), SMS (SMS Works), Waveform |
| [File Upload](./Backend/FILE_UPLOAD.md) | Multer config, upload flow, waveform strategy |
| [Middleware](./Backend/MIDDLEWARE.md) | JWT auth middleware detail |
| [Deployment](./Getting-Started/DEPLOYMENT.md) | AWS infrastructure, deploy script |
| [Getting Started](./Getting-Started/LOCAL_SETUP.md) | Local development setup |
| [Testing](./Testing/index.md) | Test suite, Jest config, coverage |

## Quick Reference

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`
- **WebSocket**: `ws://localhost:3001`
- **Swagger UI**: `http://localhost:3001/api/docs`
- **Health Check**: `http://localhost:3001/api/health`
- **Database**: PostgreSQL via Prisma ORM
- **Cache/Presence**: Redis
- **File Storage**: Local (`/uploads`) → S3 in production
