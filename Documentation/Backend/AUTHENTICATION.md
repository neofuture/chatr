# Authentication

## Overview

Chatr uses a two-step login flow: password verification followed by OTP confirmation. All API access beyond public endpoints requires a JWT bearer token.

## Registration Flow

```
1. POST /api/auth/register
   └─ Validate fields (email, username, password, phone)
   └─ Hash password with bcrypt (10 rounds)
   └─ Create User record in DB
   └─ Generate email verification OTP (6 digits, 15 min expiry)
   └─ Send verification email

2. POST /api/auth/verify-email
   └─ Validate OTP against DB
   └─ Set User.emailVerified = true
   └─ Clear OTP fields
```

## Login Flow

```
1. POST /api/auth/login
   └─ Find user by email
   └─ Compare password with bcrypt
   └─ Generate login OTP (6 digits, 10 min expiry)
   └─ Send via email or SMS (based on User.loginVerificationMethod)
   └─ Return { userId, verificationMethod }

2. POST /api/auth/verify-login
   └─ Find user by userId
   └─ Compare OTP (timing-safe)
   └─ Check expiry
   └─ Clear OTP fields
   └─ Sign JWT (payload: { userId, username })
   └─ Return { token, user }
```

## JWT

Tokens are signed with `HS256` using `JWT_SECRET` from environment variables.

**Payload structure:**
```json
{
  "userId": "uuid",
  "username": "johndoe",
  "iat": 1234567890,
  "exp": 1234654290
}
```

Default expiry: `7d`

**Usage in REST:**
```
Authorization: Bearer <token>
```

**Usage in WebSocket:**
```javascript
io.connect(url, { auth: { token } })
```

The `authenticateToken` middleware (`backend/src/middleware/auth.ts`) validates the token and attaches `req.user` to the request.

## Two-Factor Authentication (TOTP)

When 2FA is enabled, login requires an additional TOTP code after the OTP step.

- Secret generated with `speakeasy.generateSecret()`
- Stored encrypted in `User.twoFactorSecret`
- Verified with `speakeasy.totp.verify()`
- QR code generated with `qrcode` package for authenticator app setup

## Password Reset Flow

```
1. POST /api/auth/forgot-password
   └─ Generate reset OTP (6 digits, 15 min expiry)
   └─ Send to registered email

2. POST /api/auth/reset-password
   └─ Validate OTP
   └─ Hash new password
   └─ Update User.password
   └─ Clear reset OTP fields
```

## Phone Verification

Phone numbers are stored in E.164 format. Verification is done via SMS OTP using the configured SMS provider (Twilio or equivalent).

```
POST /api/auth/verify-phone
└─ Validate OTP against User.phoneVerificationCode
└─ Set User.phoneVerified = true
```

## Security Notes

- Passwords are never stored in plaintext — bcrypt with 10 rounds
- OTPs are time-limited and single-use
- JWT secrets must be at least 32 characters (use `openssl rand -hex 32`)
- All OTP comparison uses constant-time checks to prevent timing attacks
- The `Authorization` header is required on all `🔒` endpoints — returning `401` if absent or invalid

