# AuthPanel

**File:** `src/components/panels/AuthPanel/AuthPanel.tsx`

A combined login and registration sliding panel. Handles both views internally with animated transitions between them.

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
| `login` | Email + password form → triggers `LoginVerificationContent` on success |
| `register` | Username, email, password, phone form → triggers `EmailVerificationContent` on success |

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

