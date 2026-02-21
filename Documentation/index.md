# Chatr — Technical Documentation

Chatr is a real-time messaging platform built on a Node.js/Express backend and Next.js frontend, communicating over REST and WebSocket (Socket.io).

## Documentation Structure

| Section | Description |
|---------|-------------|
| [Architecture](./Architecture/OVERVIEW.md) | System design, component diagram, data flow |
| [API Reference](./API/REST_API.md) | All REST endpoints, request/response schemas |
| [WebSocket](./WebSocket/EVENTS.md) | Socket.io events, payloads, connection lifecycle |
| [Database](./Database/SCHEMA.md) | Prisma schema, models, indexes, migrations |
| [Frontend](./Frontend/OVERVIEW.md) | Next.js structure, contexts, components |
| [Features](./Features/MESSAGING.md) | Messaging, voice, file upload, presence |
| [Authentication](./Backend/AUTHENTICATION.md) | JWT, SMS/email verification, 2FA |
| [Deployment](./Getting-Started/DEPLOYMENT.md) | AWS infrastructure, deploy script |
| [Getting Started](./Getting-Started/LOCAL_SETUP.md) | Local development setup |
| [Testing](./Testing/OVERVIEW.md) | Test suite, Jest config, coverage |

## Quick Reference

- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001`
- **WebSocket**: `ws://localhost:3001`
- **Database**: PostgreSQL via Prisma ORM
- **Cache/Presence**: Redis
- **File Storage**: Local (`/uploads`) → S3 in production

