# Chatrr Frontend

NextJS-based chat application frontend with real-time messaging support.

## Setup

```bash
npm install
npm run dev
```

The frontend will start at `http://localhost:3000`

## Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

## Features

- User authentication and registration
- Private messaging
- Group chat
- User search
- Online/offline support with message queue
- Real-time notifications

