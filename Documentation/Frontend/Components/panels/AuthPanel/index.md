# AuthPanel

**File:** `src/components/panels/AuthPanel/AuthPanel.tsx`

A combined login and registration sliding panel. This is the sole authentication entry point — there are no dedicated `/login` or `/register` routes. The panel is triggered from the `SiteNav` avatar dropdown or via the `chatr:open-auth` custom event.

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

| Trigger | Location | Event |
|---------|----------|-------|
| SiteNav avatar dropdown | `SiteNav.tsx` | Direct state management — `openAuthPanel('login')` or `openAuthPanel('register')` |
| Footer "Create Account" | `SiteFooter.tsx` | `chatr:open-auth` custom event with `{ view: 'register' }` |
| Mobile menu | `SiteNav.tsx` | Direct state management via mobile auth section buttons |

## Auth State Synchronisation

On successful login, the panel:
1. Stores `token` and `user` in `localStorage`
2. Dispatches `window.dispatchEvent(new Event('chatr:auth-changed'))`
3. Shows a success toast
4. Closes the panel

The `SiteNav` component listens for both `storage` (cross-tab) and `chatr:auth-changed` (in-tab) events to update the avatar dropdown immediately.

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
