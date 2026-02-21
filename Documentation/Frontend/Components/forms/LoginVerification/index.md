# LoginVerification

**File:** `src/components/forms/LoginVerification/LoginVerification.tsx`

A 6-digit OTP entry form to complete the two-step login flow. Exported as `LoginVerificationContent`.

## Props

```typescript
interface LoginVerificationProps {
  userId:            string;
  email:             string;
  password:          string;
  verificationCode?: string;
}
```

| Prop | Type | Description |
|------|------|-------------|
| `userId` | `string` | Returned by `POST /api/auth/login` |
| `email` | `string` | User's email — displayed for context |
| `password` | `string` | Passed through to allow re-sending if needed |
| `verificationCode` | `string` | Pre-fill for demo/testing only |

## Flow

```
1. User enters 6-digit code (auto-advances between inputs)
2. POST /api/auth/verify-login { userId, code }
3. On success → saves token + user to localStorage → router.push('/app')
4. On failure → showToast(error, 'error') + clears inputs
```

## Usage

```tsx
openPanel('Verify Login', <LoginVerificationContent userId={userId} email={email} password={password} />);
```

