# ForgotPassword

**File:** `src/components/forms/ForgotPassword/ForgotPassword.tsx`

Password reset request form. Exported as `ForgotPasswordContent` for use in a panel.

## Exports

```typescript
export function ForgotPasswordContent(): JSX.Element
```

No props — state is internal.

## Flow

```
1. User enters email address
2. POST /api/auth/forgot-password { email }
3. On success → showToast('Reset code sent', 'success') → opens LoginForm panel
4. On failure → showToast(error, 'error')
```

## Usage

```tsx
openPanel('Forgot Password', <ForgotPasswordContent />);
```

