# Hooks

Custom React hooks in `frontend/src/hooks/`.

| Hook | Description |
|---|---|
| [`useAuth`](./useAuth.md) | Auth state, login, logout — reads/writes `localStorage`, redirects via router |
| [`useOfflineSync`](./useOfflineSync.md) | Monitors `navigator.onLine`, auto-syncs IndexedDB-queued messages on reconnect |
| [`useConversation`](./useConversation.md) | Full messaging state machine — messages, presence, socket events, file/voice sending, manual offline mode |

