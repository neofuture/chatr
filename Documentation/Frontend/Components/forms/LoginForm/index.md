# LoginForm

**File:** `src/components/forms/LoginForm/LoginForm.tsx`

Email and password sign-in form. Exported as `LoginFormContent` for use inside a `PanelContainer` panel.

## Exports

```typescript
export function LoginFormContent(): JSX.Element
```

No props — state is internal. On successful credential check, opens the `LoginVerification` panel with the returned `userId`.

## Flow

```
1. User enters email + password
2. POST /api/auth/login
3. On success → openPanel('Verify Login', <LoginVerificationContent userId=... />)
4. On failure → showToast(error, 'error')
```

## Usage

```tsx
import { LoginFormContent } from '@/components/forms/LoginForm/LoginForm';

openPanel('Sign In', <LoginFormContent />);
```

