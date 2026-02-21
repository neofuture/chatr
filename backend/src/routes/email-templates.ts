import { Router, Request, Response } from 'express';
import { LOGO_BASE64 } from '../services/logo-base64-constant';
import { getLoginVerificationEmailHtml, getPasswordResetEmailHtml, getVerificationEmailHtml } from '../services/email';

const router = Router();

const MAIL_FROM_NAME = process.env.PRODUCT_NAME || 'Chatr';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * GET /api/email-preview?type=verification&code=123456&email=test@example.com&username=@testuser
 */
router.get('/email-preview', (req: Request, res: Response) => {
  const { type = 'verification', code = '123456', email = 'user@example.com', username = '@testuser', userId = 'test123', theme = 'light', simulateDark = '0' } = req.query;
  const shouldSimulateDark = simulateDark === '1' || simulateDark === 'true';

  let html = '';

  switch (type) {
    case 'verification':
      html = getVerificationEmailHtml(code as string, userId as string);
      break;
    case 'login':
      html = getLoginVerificationEmailHtml(code as string, username as string);
      break;
    case 'reset':
      html = getPasswordResetEmailHtml(code as string, username as string, email as string);
      break;
    default:
      return res.status(400).json({ error: 'Invalid email type. Use: verification, login, or reset' });
  }

  // Swap CID logo for base64 so browser previews render correctly.
  html = html.replace(/src="cid:logo"/g, `src="${LOGO_BASE64}"`);

  if (shouldSimulateDark) {
    html = html.replace('<head>', `<head><style>body.preview-auto-invert{filter:invert(1) hue-rotate(180deg);}body.preview-auto-invert img{filter:invert(1) hue-rotate(180deg);}body.preview-auto-invert{background:#0b0f1a;}</style>`);
    html = html.replace('<body>', '<body class="preview-auto-invert">');
  } else if (theme === 'dark') {
    html = html.replace('color: #333;', 'color: #333; background: #0b0f1a;');
  } else {
    html = html.replace('color: #333;', 'color: #333; background: #f7fafc;');
  }

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

export default router;
