import { MailtrapClient } from 'mailtrap';
import { LOGO_BASE64 } from './logo-base64-constant'
const MAILTRAP_API_KEY = process.env.MAILTRAP_API_KEY || '';
const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || 'noreply@emberlyn.co.uk';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Chatr';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

let mailtrapClient: MailtrapClient | null = null;

// Initialize Mailtrap client if API key is available
if (MAILTRAP_API_KEY) {
  mailtrapClient = new MailtrapClient({ token: MAILTRAP_API_KEY });
  console.log('✅ Mailtrap email service initialized');
} else {
  console.warn('⚠️  Mailtrap API key not found. Emails will be logged to console only.');
}

export function getVerificationEmailHtml(code: string, userId: string): string {
  const verificationLink = `${FRONTEND_URL}/verify?code=${code}&userId=${userId}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 12px;
    }
    .container {
      background: #ffffff;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 16px;
      margin-top: 8px;
    }
    .logo {
      margin-bottom: 12px;
    }
    .code-box {
      background: #ffffff;
      border: 2px solid #ffffff;
      border-radius: 8px;
      padding: 8px 12px;
      margin: 12px 0;
      font-size: 26px;
      font-weight: bold;
      letter-spacing: 4px;
      color: #5a67d8;
      white-space: nowrap;
    }
    .button {
      display: inline-block;
      background: #ffffff;
      color: #5a67d8;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      margin-top: 30px;
      color: #e2e8f0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="cid:logo" alt="${MAIL_FROM_NAME}" style="display: block; margin: 0 auto; max-width: 240px; height: auto;">
    </div>
    <div class="content">
      <h1>Welcome to ${MAIL_FROM_NAME}!</h1>
      <p>Thank you for registering. To complete your registration, please verify your email address using the code below:</p>
      
      <div class="code-box">${code}</div>
      
      <p>Or click the button below to verify automatically:</p>
      
      <a href="${verificationLink}" class="button">Verify Email</a>
      
      <div class="footer">
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getLoginVerificationEmailHtml(code: string, username: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 12px;
    }
    .container {
      background: #ffffff;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 16px;
      margin-top: 8px;
    }
    .logo {
      margin-bottom: 12px;
    }
    .code-box {
      background: #ffffff;
      border: 2px solid #ffffff;
      border-radius: 8px;
      padding: 8px 12px;
      margin: 12px 0;
      font-size: 26px;
      font-weight: bold;
      letter-spacing: 4px;
      color: #5a67d8;
      white-space: nowrap;
    }
    .warning {
      background: rgba(255, 255, 255, 0.15);
      border-left: 4px solid #ffffff;
      padding: 12px;
      margin: 20px 0;
      text-align: left;
      color: #ffffff;
    }
    .footer {
      margin-top: 30px;
      color: #e2e8f0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="cid:logo" alt="${MAIL_FROM_NAME}" style="display: block; margin: 0 auto; max-width: 240px; height: auto;">
    </div>
    <div class="content">
      <h1>Login Verification</h1>
      <p>Hello ${username},</p>
      <p>We received a login attempt for your account. Please use the code below to complete your login:</p>
      
      <div class="code-box">${code}</div>
      
      <div class="warning">
        <strong>⚠️ Security Notice:</strong><br>
        If you didn't attempt to log in, please secure your account immediately.
      </div>
      
      <div class="footer">
        <p>This code will expire in 15 minutes.</p>
        <p>Login requested from your device. If this wasn't you, please change your password immediately.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getPasswordResetEmailHtml(code: string, username: string, email: string): string {
  const resetLink = `${FRONTEND_URL}/reset-password?code=${code}&email=${encodeURIComponent(email)}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 12px;
    }
    .container {
      background: #ffffff;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      border: 1px solid #e2e8f0;
    }
    .content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #ffffff;
      border-radius: 8px;
      padding: 16px;
      margin-top: 8px;
    }
    .logo {
      margin-bottom: 12px;
    }
    .button {
      display: inline-block;
      background: #ffffff;
      color: #5a67d8;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      margin: 20px 0;
      font-weight: 600;
    }
    .warning {
      background: rgba(255, 255, 255, 0.15);
      border-left: 4px solid #ffffff;
      padding: 12px;
      margin: 20px 0;
      text-align: left;
      color: #ffffff;
    }
    .footer {
      margin-top: 30px;
      color: #e2e8f0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="cid:logo" alt="${MAIL_FROM_NAME}" style="display: block; margin: 0 auto; max-width: 240px; height: auto;">
    </div>
    <div class="content">
      <h1>Password Reset Request</h1>
      <p>Hello ${username},</p>
      <p>We received a request to reset your password. Use the button below to continue:</p>

      <a href="${resetLink}" class="button">Reset Password</a>

      <div class="warning">
        <strong>⚠️ Security Notice:</strong><br>
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
      </div>

      <div class="footer">
        <p>This link will expire in 15 minutes.</p>
        <p>If the button doesn't work, copy and paste this URL into your browser:</p>
        <p>${resetLink}</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  userId: string
): Promise<boolean> {
  const verificationLink = `${FRONTEND_URL}/verify?code=${code}&userId=${userId}`;

  const htmlContent = getVerificationEmailHtml(code, userId);

  const textContent = `
Welcome to ${MAIL_FROM_NAME}!

Thank you for registering. To complete your registration, please verify your email address using the code below:

Your verification code: ${code}

Or visit this link: ${verificationLink}

This code will expire in 15 minutes.

If you didn't create an account, please ignore this email.
  `.trim();

  // If Mailtrap is configured, send email
  if (mailtrapClient) {
    try {
      // Extract base64 data from the data URL
      const base64Data = LOGO_BASE64.replace(/^data:image\/\w+;base64,/, '');

      await mailtrapClient.send({
        from: {
          email: MAIL_FROM_ADDRESS,
          name: MAIL_FROM_NAME,
        },
        to: [{ email }],
        subject: `Verify your ${MAIL_FROM_NAME} account`,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            filename: 'logo.png',
            content: base64Data,
            type: 'image/png',
            disposition: 'inline',
            content_id: 'logo'
          }
        ]
      });

      console.log(`✅ Verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      // Log the code so it's still accessible in development
      console.log(`Verification code for ${email}: ${code}`);
      return false;
    }
  } else {
    // Fallback: Log to console
    console.log(`📧 [EMAIL] Verification code for ${email}: ${code}`);
    console.log(`📧 [EMAIL] Verification link: ${verificationLink}`);
    return false;
  }
}

/**
 * Send login verification code (2FA via email)
 */
export async function sendLoginVerificationEmail(
  email: string,
  code: string,
  username: string
): Promise<boolean> {
  const htmlContent = getLoginVerificationEmailHtml(code, username);

  const textContent = `
Login Verification

Hello ${username},

We received a login attempt for your account. Please use the code below to complete your login:

Your verification code: ${code}

⚠️ Security Notice: If you didn't attempt to log in, please secure your account immediately.

This code will expire in 15 minutes.

Login requested from your device. If this wasn't you, please change your password immediately.
  `.trim();

  // If Mailtrap is configured, send email
  if (mailtrapClient) {
    try {
      // Extract base64 data from the data URL
      const base64Data = LOGO_BASE64.replace(/^data:image\/\w+;base64,/, '');

      await mailtrapClient.send({
        from: {
          email: MAIL_FROM_ADDRESS,
          name: MAIL_FROM_NAME,
        },
        to: [{ email }],
        subject: `${MAIL_FROM_NAME} Login Verification Code`,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            filename: 'logo.png',
            content: base64Data,
            type: 'image/png',
            disposition: 'inline',
            content_id: 'logo'
          }
        ]
      });

      console.log(`✅ Login verification email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send login verification email:', error);
      // Log the code so it's still accessible in development
      console.log(`Login verification code for ${email}: ${code}`);
      return false;
    }
  } else {
    // Fallback: Log to console
    console.log(`📧 [EMAIL] Login verification code for ${email}: ${code}`);
    return false;
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  resetCode: string,
  username: string
): Promise<boolean> {
  const htmlContent = getPasswordResetEmailHtml(resetCode, username, email);

  const textContent = `
Password Reset Request

Hello ${username},

We received a request to reset your password. Use the link below to reset your password:

${FRONTEND_URL}/reset-password?code=${resetCode}&email=${encodeURIComponent(email)}

⚠️ Security Notice: If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

This link will expire in 15 minutes.

For security reasons, never share this link with anyone.
  `.trim();

  // If Mailtrap is configured, send email
  if (mailtrapClient) {
    try {
      // Extract base64 data from the data URL
      const base64Data = LOGO_BASE64.replace(/^data:image\/\w+;base64,/, '');

      await mailtrapClient.send({
        from: {
          email: MAIL_FROM_ADDRESS,
          name: MAIL_FROM_NAME,
        },
        to: [{ email }],
        subject: `Reset your ${MAIL_FROM_NAME} password`,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            filename: 'logo.png',
            content: base64Data,
            type: 'image/png',
            disposition: 'inline',
            content_id: 'logo'
          }
        ]
      });

      console.log(`✅ Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      console.log(`Password reset code for ${email}: ${resetCode}`);
      return false;
    }
  } else {
    // Fallback: Log to console
    console.log(`📧 [EMAIL] Password reset code for ${email}: ${resetCode}`);
    return false;
  }
}

export { mailtrapClient };

