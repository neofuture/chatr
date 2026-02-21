# ToastContainer

**File:** `src/components/ToastContainer/ToastContainer.tsx`

Renders the queue of active toast notifications from `ToastContext`. Mount once in the app root.

## Props

None. Driven by `ToastContext`.

## ToastContext API

```typescript
interface Toast {
  id:        string;
  message:   string;
  type:      'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

// From useToast() hook
const { showToast } = useToast();

showToast(message: string, type: Toast['type'], duration?: number): void
```

## Toast Types

| Type | Title | Colour |
|------|-------|--------|
| `success` | Success | Green |
| `error` | Error | Red |
| `warning` | Warning | Orange |
| `info` | Info | Blue |

## Behaviour

- Toasts auto-dismiss after `duration` ms (default 4000ms)
- Timer pauses on hover
- Toasts animate in and out
- Multiple toasts stack vertically

## Usage

```tsx
// Layout (once)
<ToastContainer />

// Anywhere in the app
const { showToast } = useToast();
showToast('Message sent', 'success');
showToast('Upload failed', 'error', 6000);
```

