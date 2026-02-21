# Authentication

## Overview

Chatr uses a multi-step authentication flow. Registration requires either an email or phone number, a username, and a password. Login requires password + OTP. Optionally, TOTP-based 2FA can be enabled as an additional step.

All API access beyond public endpoints requires a JWT bearer token in the `Authorization` header.

---

## Registration Flow

```mermaid
flowchart TD
    A[POST /api/auth/register] --> B{Validate fields}
    B -- Invalid --> C[400 Bad Request]
    B -- Valid --> D{Email already verified?}
    D -- Yes --> E[409 Conflict]
    D -- No --> F[Hash password bcrypt 10 rounds]
    F --> G[Generate 6-digit OTP, 15 min expiry]
    G --> H{Email or Phone?}
    H -- Email --> I[Send verification email]
    H -- Phone --> J[Send SMS via Twilio]
    I --> K[201 Created]
    J --> K

    K --> L[POST /api/auth/verify-email or verify-phone]
    L --> M{OTP valid and not expired?}
    M -- No --> N[400 Invalid code]
    M -- Yes --> O[Set emailVerified / phoneVerified = true]
    O --> P[Clear OTP fields]
```

**Password validation rules:**
- Minimum 8 characters
- At least one uppercase letter
- At least one special character (`!@#$%^&*` etc.)

**Username validation rules:**
- 3–20 characters
- Alphanumeric and underscores only
- Automatically prefixed with `@` if not provided

---

## Login Flow

```mermaid
flowchart TD
    A[POST /api/auth/login] --> B{Find user by email}
    B -- Not found --> C[401 Unauthorized]
    B -- Found --> D{bcrypt.compare password}
    D -- Wrong --> C
    D -- Match --> E[Generate 6-digit login OTP, 10 min expiry]
    E --> F{loginVerificationMethod}
    F -- email --> G[Send email OTP]
    F -- sms --> H[Send SMS OTP]
    G --> I[200 — userId + verificationMethod returned]
    H --> I

    I --> J[POST /api/auth/verify-login NOT IMPLEMENTED YET]
    J --> K{OTP valid and not expired?}
    K -- No --> L[400]
    K -- Yes --> M[Clear OTP fields]
    M --> N[Sign JWT HS256, 7 day expiry]
    N --> O[Return token + user object]
```

> ⚠️ `POST /api/auth/verify-login` is referenced in the login flow but is not yet a standalone endpoint. Login OTP verification is handled within the login route itself.

---

## JWT

Tokens are signed with `HS256` using `JWT_SECRET` from environment variables.

**Payload:**
```json
{
  "userId": "uuid",
  "username": "@johndoe",
  "iat": 1740000000,
  "exp": 1740604800
}
```

**Default expiry:** `7d`

**REST usage:**
```
Authorization: Bearer <token>
```

**WebSocket usage:**
```javascript
io.connect(url, { auth: { token } })
```

The `authenticateToken` middleware (`backend/src/middleware/auth.ts`) validates the token and attaches `req.user` to the request. Invalid or expired tokens return `401`.

---

## Two-Factor Authentication (TOTP)

When 2FA is enabled, a TOTP code is required after password + OTP verification.

```mermaid
flowchart LR
    A[POST /api/auth/2fa/setup] --> B[speakeasy.generateSecret]
    B --> C[Store secret in User.twoFactorSecret]
    C --> D[Generate QR code with qrcode package]
    D --> E[Return secret + qrCode base64]

    F[User scans QR in authenticator app]
    F --> G[POST /api/auth/2fa/verify]
    G --> H[speakeasy.totp.verify token against secret]
    H -- Valid --> I[Set twoFactorEnabled = true]
    H -- Invalid --> J[400 Invalid token]
```

- Secret generated with `speakeasy.generateSecret({ length: 20 })`
- Stored in `User.twoFactorSecret`
- Verified with `speakeasy.totp.verify()` (±1 window)
- QR code rendered as `data:image/png;base64,...` for authenticator apps (Google Authenticator, Authy etc.)

---

## Password Reset Flow

```mermaid
flowchart TD
    A[POST /api/auth/forgot-password] --> B{Find user by email}
    B -- Not found --> C[200 — silent to prevent enumeration]
    B -- Found --> D[Generate 6-digit OTP, 15 min expiry]
    D --> E[Send password reset email]
    E --> F[200 OK]

    F --> G[POST /api/auth/reset-password NOT YET IMPLEMENTED]
    G --> H{Validate OTP}
    H -- Invalid --> I[400]
    H -- Valid --> J[Hash new password]
    J --> K[Update User.password]
    K --> L[Clear reset OTP fields]
```

> ⚠️ `POST /api/auth/reset-password` is documented for completeness but is not yet implemented as a standalone endpoint.

---

## Phone Verification

Phone numbers are stored in E.164 format (e.g. `+447911123456`). The `validatePhoneNumber` and `formatPhoneNumber` helpers in `services/sms.ts` normalise input before storage.

**Dev bypass:** A whitelist of dev phone numbers is hardcoded in `auth.ts`. These numbers skip duplicate checks and log OTPs to the console instead of sending real SMS — useful for local development without a real Twilio account.

---

## Token Storage (Frontend)

Tokens are stored in `localStorage`:

```typescript
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(user));
```

The `useAuth` hook reads these on mount and provides `login()` and `logout()` helpers. `AppLayout` enforces the presence of both before rendering protected routes.

WebSocketContext reads the token from `localStorage` and passes it as `auth.token` in the Socket.io handshake. If the token is absent or invalid, the connection is skipped or rejected.
