# ConnectionIndicator

**File:** `src/components/ConnectionIndicator/ConnectionIndicator.tsx`

A status indicator that shows the current WebSocket connection state. Displays a coloured dot with label. No props.

## Props

None. Reads state from `WebSocketContext`.

## States

| State | Display |
|-------|---------|
| Connected | Green dot — "Connected" |
| Connecting | Amber dot — "Connecting..." |
| Disconnected | Red dot — "Disconnected" |
| Auth error | Red dot — links to sign-in |

## Behaviour

- Uses Framer Motion `AnimatePresence` to animate state transitions
- Detects missing `token` or `user` in `localStorage` and surfaces an auth error state
- On auth error, clicking navigates to `/` for re-authentication

## Usage

```tsx
<ConnectionIndicator />
```

