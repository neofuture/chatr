# AuthPanel

**File:** `src/components/panels/AuthPanel/AuthPanel.tsx`

A combined login and registration panel. Rendered on the dedicated `/login` page as the sole authentication entry point for the app.

## Props

```typescript
interface AuthPanelProps {
  isOpen:      boolean;
  onClose:     () => void;
  initialView: 'login' | 'register';
}
```

| Prop | Type | Description |
|------|------|-------------|
| `isOpen` | `boolean` | Controls panel visibility |
| `onClose` | `function` | Called when the panel is dismissed |
| `initialView` | `string` | Which view to show first — `'login'` or `'register'` |

## Views

| View | Content |
|------|---------|
| `login` | Email/username + password form with Email/SMS verification toggle. Default verification method is **email**. On success, dispatches `chatr:auth-changed` event and stores token in `localStorage` |
| `register` | First name, last name, email, phone, username, gender, password form. Validates all fields client-side. On success, triggers `EmailVerificationContent` for OTP verification |

## Integration Points

| Trigger | Location | Description |
|---------|----------|-------------|
| `/login` page | `src/app/login/page.tsx` | Renders the AuthPanel directly with login/register toggle |

## Auth State Synchronisation

On successful login, the panel:
1. Stores `token` and `user` in `localStorage`
2. Dispatches `window.dispatchEvent(new Event('chatr:auth-changed'))`
3. Shows a success toast
4. Closes the panel

On successful login, the user is redirected to `/app`. On logout, the user is redirected back to `/login`.

## Transitions

The panel animates between login and register views. The active view slides out while the new view slides in.

## Usage

```tsx
<AuthPanel
  isOpen={showAuth}
  onClose={() => setShowAuth(false)}
  initialView="login"
/>
```
