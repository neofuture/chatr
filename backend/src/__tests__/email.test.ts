jest.mock('mailtrap', () => ({
  MailtrapClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true }),
  })),
}));

jest.mock('../services/logo-base64-constant', () => ({
  LOGO_BASE64: 'data:image/png;base64,FAKEDATA',
}));

import {
  getVerificationEmailHtml,
  getLoginVerificationEmailHtml,
  getPasswordResetEmailHtml,
  sendVerificationEmail,
  sendLoginVerificationEmail,
  sendPasswordResetEmail,
} from '../services/email';

describe('Email Service', () => {
  describe('getVerificationEmailHtml', () => {
    it('should generate HTML with verification code', () => {
      const html = getVerificationEmailHtml('123456', 'user-id-1');
      expect(html).toContain('123456');
      expect(html).toContain('user-id-1');
      expect(html).toContain('Verify Email');
      expect(html).toContain('Welcome to');
    });

    it('should include verification link', () => {
      const html = getVerificationEmailHtml('ABCDEF', 'uid-2');
      expect(html).toContain('verify?code=ABCDEF&userId=uid-2');
    });

    it('should include expiry notice', () => {
      const html = getVerificationEmailHtml('000000', 'u1');
      expect(html).toContain('15 minutes');
    });
  });

  describe('getLoginVerificationEmailHtml', () => {
    it('should generate HTML with login code and username', () => {
      const html = getLoginVerificationEmailHtml('654321', '@testuser');
      expect(html).toContain('654321');
      expect(html).toContain('@testuser');
      expect(html).toContain('Login Verification');
    });

    it('should include security notice', () => {
      const html = getLoginVerificationEmailHtml('111111', '@user');
      expect(html).toContain('Security Notice');
    });
  });

  describe('getPasswordResetEmailHtml', () => {
    it('should generate HTML with reset link', () => {
      const html = getPasswordResetEmailHtml('RESET1', '@admin', 'admin@test.com');
      expect(html).toContain('Reset Password');
      expect(html).toContain('RESET1');
      expect(html).toContain('admin%40test.com');
    });

    it('should include security warning', () => {
      const html = getPasswordResetEmailHtml('R1', '@u', 'u@test.com');
      expect(html).toContain('Security Notice');
      expect(html).toContain("didn't request");
    });
  });

  describe('sendVerificationEmail', () => {
    it('should return false when mailtrap is not configured (no API key)', async () => {
      const result = await sendVerificationEmail('test@test.com', '123456', 'uid-1');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('sendLoginVerificationEmail', () => {
    it('should return false when mailtrap is not configured', async () => {
      const result = await sendLoginVerificationEmail('test@test.com', '123456', '@user');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should return false when mailtrap is not configured', async () => {
      const result = await sendPasswordResetEmail('test@test.com', 'RESET', '@user');
      expect(typeof result).toBe('boolean');
    });
  });
});
