# EmailVerification

**File:** `src/components/forms/EmailVerification/EmailVerification.tsx`

A 6-digit OTP entry form for email address or phone number verification. Exported as `EmailVerificationContent`.

## Props

```typescript
interface EmailVerificationProps {
  userId:            string;
  email?:            string;
  verificationCode?: string;
  verificationType?: 'email' | 'login' | 'phone';
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | required | The user being verified |
| `email` | `string` | — | Displayed as context (e.g. "Code sent to...") |
| `verificationCode` | `string` | — | Pre-fill for demo/testing only |
| `verificationType` | `string` | `'email'` | Controls which API endpoint is called and copy shown |

## Verification Type → Endpoint

| Type | Endpoint |
|------|---------|
| `email` | `POST /api/auth/verify-email` |
| `phone` | `POST /api/auth/verify-phone` |
| `login` | `POST /api/auth/verify-login` |

## Usage

```tsx
openPanel('Verify Email', <EmailVerificationContent userId={userId} email={email} verificationType="email" />);
```

