import request from 'supertest';
import express from 'express';

jest.mock('../services/email', () => ({
  getVerificationEmailHtml: jest.fn().mockReturnValue('<html><body>Verify: CODE123</body></html>'),
  getLoginVerificationEmailHtml: jest.fn().mockReturnValue('<html><body>Login: CODE456</body></html>'),
  getPasswordResetEmailHtml: jest.fn().mockReturnValue('<html><body>Reset: CODE789</body></html>'),
  sendVerificationEmail: jest.fn(),
  sendLoginVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock('../services/logo-base64-constant', () => ({
  LOGO_BASE64: 'data:image/png;base64,FAKE_LOGO_DATA',
}));

import emailTemplatesRouter from '../routes/email-templates';
import { getVerificationEmailHtml, getLoginVerificationEmailHtml, getPasswordResetEmailHtml } from '../services/email';

const app = express();
app.use(express.json());
app.use('/api/email-templates', emailTemplatesRouter);

describe('Email Templates Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getVerificationEmailHtml as jest.Mock).mockReturnValue('<html><body><img src="cid:logo">Verify: CODE123</body></html>');
    (getLoginVerificationEmailHtml as jest.Mock).mockReturnValue('<html><body><img src="cid:logo">Login: CODE456</body></html>');
    (getPasswordResetEmailHtml as jest.Mock).mockReturnValue('<html><body><img src="cid:logo">Reset: CODE789</body></html>');
  });

  describe('GET /api/email-templates/email-preview', () => {
    it('should render verification email by default', async () => {
      const response = await request(app)
        .get('/api/email-templates/email-preview')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/html/);
      expect(response.text).toContain('Verify');
      expect(getVerificationEmailHtml).toHaveBeenCalledWith('123456', 'test123');
    });

    it('should render verification email with custom params', async () => {
      const response = await request(app)
        .get('/api/email-templates/email-preview?type=verification&code=MYCODE&userId=myuser123')
        .expect(200);

      expect(getVerificationEmailHtml).toHaveBeenCalledWith('MYCODE', 'myuser123');
      expect(response.text).toContain('Verify');
    });

    it('should render login verification email', async () => {
      const response = await request(app)
        .get('/api/email-templates/email-preview?type=login&code=999999&username=@testuser')
        .expect(200);

      expect(getLoginVerificationEmailHtml).toHaveBeenCalledWith('999999', '@testuser');
      expect(response.text).toContain('Login');
    });

    it('should render password reset email', async () => {
      const response = await request(app)
        .get('/api/email-templates/email-preview?type=reset&code=RESETCODE&username=@admin&email=admin@example.com')
        .expect(200);

      expect(getPasswordResetEmailHtml).toHaveBeenCalledWith('RESETCODE', '@admin', 'admin@example.com');
      expect(response.text).toContain('Reset');
    });

    it('should return 400 for invalid email type', async () => {
      const response = await request(app)
        .get('/api/email-templates/email-preview?type=unknown')
        .expect(400);

      expect(response.body.error).toContain('Invalid email type');
    });

    it('should replace CID logo with base64', async () => {
      const response = await request(app)
        .get('/api/email-templates/email-preview')
        .expect(200);

      expect(response.text).not.toContain('cid:logo');
      expect(response.text).toContain('data:image/png;base64,FAKE_LOGO_DATA');
    });

    it('should simulate dark mode when requested', async () => {
      const response = await request(app)
        .get('/api/email-templates/email-preview?simulateDark=1')
        .expect(200);

      expect(response.text).toContain('preview-auto-invert');
    });

    it('should apply dark theme background', async () => {
      (getVerificationEmailHtml as jest.Mock).mockReturnValue('<html><head></head><body style="color: #333;">content</body></html>');

      const response = await request(app)
        .get('/api/email-templates/email-preview?theme=dark')
        .expect(200);

      expect(response.text).toContain('background: #0b0f1a');
    });

    it('should apply light theme background by default', async () => {
      (getVerificationEmailHtml as jest.Mock).mockReturnValue('<html><head></head><body style="color: #333;">content</body></html>');

      const response = await request(app)
        .get('/api/email-templates/email-preview?theme=light')
        .expect(200);

      expect(response.text).toContain('background: #f7fafc');
    });
  });
});
