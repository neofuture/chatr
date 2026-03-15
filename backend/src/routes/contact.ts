import { Router, Request, Response } from 'express';
import { mailtrapClient } from '../services/email';
import { LOGO_BASE64 } from '../services/logo-base64-constant';

const router = Router();

const MAIL_FROM_ADDRESS = process.env.MAIL_FROM_ADDRESS || 'noreply@emberlyn.co.uk';
const MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'Chatr';
const CONTACT_TO_EMAIL = process.env.CONTACT_EMAIL || 'carlfearby@me.com';

function getContactEmailHtml(name: string, email: string, company: string, message: string): string {
  const escapedMessage = message.replace(/\n/g, '<br>');
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 12px; }
    .container { background: #ffffff; border-radius: 10px; padding: 20px; border: 1px solid #e2e8f0; }
    .content { background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #ffffff; border-radius: 8px; padding: 24px; margin-top: 8px; }
    .logo { margin-bottom: 12px; text-align: center; }
    h1 { font-size: 1.4rem; margin-bottom: 1rem; }
    .field { margin-bottom: 16px; }
    .label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7; margin-bottom: 4px; }
    .value { background: rgba(255,255,255,0.1); padding: 10px 14px; border-radius: 6px; font-size: 0.95rem; }
    .message-value { background: rgba(255,255,255,0.1); padding: 14px; border-radius: 6px; font-size: 0.95rem; white-space: pre-wrap; }
    .footer { margin-top: 20px; font-size: 0.8rem; opacity: 0.6; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <img src="cid:logo" alt="${MAIL_FROM_NAME}" style="display: block; margin: 0 auto; max-width: 200px; height: auto;">
    </div>
    <div class="content">
      <h1>New Contact Enquiry</h1>
      <div class="field"><div class="label">Name</div><div class="value">${name}</div></div>
      <div class="field"><div class="label">Email</div><div class="value">${email}</div></div>
      ${company ? `<div class="field"><div class="label">Company</div><div class="value">${company}</div></div>` : ''}
      <div class="field"><div class="label">Message</div><div class="message-value">${escapedMessage}</div></div>
      <div class="footer">Sent from the Chatr website contact form</div>
    </div>
  </div>
</body>
</html>`.trim();
}

router.post('/contact', async (req: Request, res: Response) => {
  const { name, email, company, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message too long (max 5000 characters).' });
  }

  const htmlContent = getContactEmailHtml(name, email, company || '', message);
  const textContent = `New Contact Enquiry\n\nName: ${name}\nEmail: ${email}${company ? `\nCompany: ${company}` : ''}\n\nMessage:\n${message}`;

  if (mailtrapClient) {
    try {
      const base64Data = LOGO_BASE64.replace(/^data:image\/\w+;base64,/, '');
      await mailtrapClient.send({
        from: { email: MAIL_FROM_ADDRESS, name: MAIL_FROM_NAME },
        to: [{ email: CONTACT_TO_EMAIL }],
        reply_to: { email, name },
        subject: `Chatr Enquiry from ${name}${company ? ` (${company})` : ''}`,
        text: textContent,
        html: htmlContent,
        attachments: [{ filename: 'logo.png', content: base64Data, type: 'image/png', disposition: 'inline' as const, content_id: 'logo' }],
      });
      console.log(`✅ Contact form email sent (from: ${email})`);
      return res.json({ success: true });
    } catch (error) {
      console.error('❌ Failed to send contact email:', error);
      return res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
  } else {
    console.log(`📧 [CONTACT] From: ${name} <${email}>${company ? ` (${company})` : ''}\n${message}`);
    return res.json({ success: true });
  }
});

export default router;
