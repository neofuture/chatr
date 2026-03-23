# Chatr Frontend

Next.js 16 + React 19 chat application frontend with real-time messaging, offline support, and mobile-first design.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

The frontend will start at `http://localhost:3000`

## Environment Variables

Create a `.env.local` file (or copy from `.env.example`):

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
NEXT_PUBLIC_PRODUCT_NAME=Chatr
```

## Features

- Real-time messaging with Socket.IO (DMs and groups)
- User authentication and registration with email/phone/2FA verification
- Group chat with roles, invites, and AI summaries
- Voice recording, image/file sharing (up to 50MB)
- Friends, message requests, and presence indicators
- Offline-first with IndexedDB caching and outbound queue
- Dark/light themes with system-aware toggle
- Mobile-first responsive design with bottom navigation
- Accessibility (ARIA roles, keyboard navigation, live regions)
- Developer dashboard with live test runner and code analytics
