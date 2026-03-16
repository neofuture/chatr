jest.mock('../services/logo-base64-constant', () => ({
  LOGO_BASE64: 'data:image/png;base64,FAKEDATA',
}));

jest.mock('../lib/testMode', () => ({
  isTestMode: jest.fn(() => false),
}));

jest.mock('mailtrap', () => ({
  MailtrapClient: jest.fn().mockImplementation(() => ({
    send: jest.fn().mockResolvedValue({ success: true }),
  })),
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

  describe('send functions (no mailtrap configured)', () => {
    let noMailSendVerification: Function;
    let noMailSendLogin: Function;
    let noMailSendReset: Function;

    beforeEach(() => {
      jest.resetModules();
      delete process.env.MAILTRAP_API_KEY;
      jest.doMock('../services/logo-base64-constant', () => ({
        LOGO_BASE64: 'data:image/png;base64,FAKEDATA',
      }));
      jest.doMock('../lib/testMode', () => ({
        isTestMode: jest.fn(() => false),
      }));
      jest.doMock('mailtrap', () => ({
        MailtrapClient: jest.fn(() => ({ send: jest.fn() })),
      }));
      const email = require('../services/email');
      noMailSendVerification = email.sendVerificationEmail;
      noMailSendLogin = email.sendLoginVerificationEmail;
      noMailSendReset = email.sendPasswordResetEmail;
    });

    it('sendVerificationEmail returns false when no mailtrap', async () => {
      const result = await noMailSendVerification('test@test.com', '123456', 'uid-1');
      expect(result).toBe(false);
    });

    it('sendLoginVerificationEmail returns false when no mailtrap', async () => {
      const result = await noMailSendLogin('test@test.com', '123456', '@user');
      expect(result).toBe(false);
    });

    it('sendPasswordResetEmail returns false when no mailtrap', async () => {
      const result = await noMailSendReset('test@test.com', 'RESET', '@user');
      expect(result).toBe(false);
    });
  });

  describe('test mode suppression', () => {
    let testSendVerification: Function;
    let testSendLogin: Function;
    let testSendReset: Function;

    beforeEach(() => {
      jest.resetModules();
      jest.doMock('../services/logo-base64-constant', () => ({
        LOGO_BASE64: 'data:image/png;base64,FAKEDATA',
      }));
      jest.doMock('../lib/testMode', () => ({
        isTestMode: jest.fn(() => true),
      }));
      jest.doMock('mailtrap', () => ({
        MailtrapClient: jest.fn(() => ({ send: jest.fn() })),
      }));

      const email = require('../services/email');
      testSendVerification = email.sendVerificationEmail;
      testSendLogin = email.sendLoginVerificationEmail;
      testSendReset = email.sendPasswordResetEmail;
    });

    it('sendVerificationEmail returns true without sending', async () => {
      expect(await testSendVerification('t@t.com', '123456', 'u1')).toBe(true);
    });

    it('sendLoginVerificationEmail returns true without sending', async () => {
      expect(await testSendLogin('t@t.com', '123456', '@u')).toBe(true);
    });

    it('sendPasswordResetEmail returns true without sending', async () => {
      expect(await testSendReset('t@t.com', 'R1', '@u')).toBe(true);
    });
  });

  describe('with mailtrap configured', () => {
    let mockSend: jest.Mock;
    let cfgSendVerification: Function;
    let cfgSendLogin: Function;
    let cfgSendReset: Function;

    beforeEach(() => {
      jest.resetModules();
      process.env.MAILTRAP_API_KEY = 'test-api-key';
      mockSend = jest.fn().mockResolvedValue({ success: true });
      jest.doMock('mailtrap', () => ({
        MailtrapClient: jest.fn(() => ({ send: mockSend })),
      }));
      jest.doMock('../services/logo-base64-constant', () => ({
        LOGO_BASE64: 'data:image/png;base64,FAKEDATA',
      }));
      jest.doMock('../lib/testMode', () => ({
        isTestMode: jest.fn(() => false),
      }));

      const email = require('../services/email');
      cfgSendVerification = email.sendVerificationEmail;
      cfgSendLogin = email.sendLoginVerificationEmail;
      cfgSendReset = email.sendPasswordResetEmail;
    });

    afterEach(() => {
      delete process.env.MAILTRAP_API_KEY;
    });

    it('sendVerificationEmail sends via mailtrap and returns true', async () => {
      const result = await cfgSendVerification('test@test.com', '123456', 'uid-1');
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email: 'test@test.com' }],
          subject: expect.stringContaining('Verify'),
          attachments: expect.arrayContaining([
            expect.objectContaining({ content_id: 'logo' }),
          ]),
        })
      );
    });

    it('sendVerificationEmail returns false on mailtrap error', async () => {
      mockSend.mockRejectedValueOnce(new Error('API error'));
      const result = await cfgSendVerification('test@test.com', '123456', 'uid-1');
      expect(result).toBe(false);
    });

    it('sendLoginVerificationEmail sends via mailtrap and returns true', async () => {
      const result = await cfgSendLogin('test@test.com', '654321', '@user');
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email: 'test@test.com' }],
          subject: expect.stringContaining('Login Verification'),
        })
      );
    });

    it('sendLoginVerificationEmail returns false on mailtrap error', async () => {
      mockSend.mockRejectedValueOnce(new Error('API error'));
      const result = await cfgSendLogin('test@test.com', '654321', '@user');
      expect(result).toBe(false);
    });

    it('sendPasswordResetEmail sends via mailtrap and returns true', async () => {
      const result = await cfgSendReset('test@test.com', 'RESET1', '@user');
      expect(result).toBe(true);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email: 'test@test.com' }],
          subject: expect.stringContaining('Reset'),
        })
      );
    });

    it('sendPasswordResetEmail returns false on mailtrap error', async () => {
      mockSend.mockRejectedValueOnce(new Error('API error'));
      const result = await cfgSendReset('test@test.com', 'RESET1', '@user');
      expect(result).toBe(false);
    });
  });
});
