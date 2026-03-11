import {
  validatePhoneNumber,
  formatPhoneNumber,
} from '../services/sms';

// Mock global fetch for sendSMS tests
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('SMS Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validatePhoneNumber', () => {
    it('should accept valid UK mobile +44 format', () => {
      expect(validatePhoneNumber('+447911123456')).toBe(true);
    });

    it('should accept valid UK mobile 07 format', () => {
      expect(validatePhoneNumber('07911123456')).toBe(true);
    });

    it('should reject +44 numbers that are too long', () => {
      expect(validatePhoneNumber('+4479111234567890')).toBe(false); // 16 chars — over limit
    });

    it('should reject too-short +44 numbers', () => {
      expect(validatePhoneNumber('+4479')).toBe(false);
    });

    it('should reject too-short 07 numbers', () => {
      expect(validatePhoneNumber('079111')).toBe(false);
    });

    it('should reject numbers that do not start with +44 or 07', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(false);
      expect(validatePhoneNumber('1234567890')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validatePhoneNumber('')).toBe(false);
    });

    it('should handle numbers with spaces/dashes (cleaned)', () => {
      expect(validatePhoneNumber('+44 7911 123 456')).toBe(true);
      expect(validatePhoneNumber('079-1112-3456')).toBe(true);
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 07 number to +44 E.164', () => {
      expect(formatPhoneNumber('07911123456')).toBe('+447911123456');
    });

    it('should keep +44 numbers as-is', () => {
      expect(formatPhoneNumber('+447911123456')).toBe('+447911123456');
    });

    it('should remove spaces and dashes', () => {
      expect(formatPhoneNumber('079 1112 3456')).toBe('+447911123456');
    });

    it('should use custom country code', () => {
      expect(formatPhoneNumber('7911123456', '+1')).toBe('+17911123456');
    });

    it('should strip leading 0 before adding country code', () => {
      expect(formatPhoneNumber('07123456789', '+44')).toBe('+447123456789');
    });
  });

  describe('sendSMS', () => {
    it('should call SMS Works API with correct payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messageid: 'msg-123' }),
      });

      const { sendSMS } = require('../services/sms');
      await sendSMS('+447911123456', 'Test message');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.thesmsworks.co.uk/v1/message/send',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('447911123456'),
        })
      );
    });

    it('should strip + prefix from phone number', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messageid: 'msg-456' }),
      });

      const { sendSMS } = require('../services/sms');
      await sendSMS('+447911000000', 'Hello');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.destination).toBe('447911000000');
    });

    it('should not throw on API error (graceful failure)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server Error'),
      });

      const { sendSMS } = require('../services/sms');
      await expect(sendSMS('+447911000000', 'Hello')).resolves.not.toThrow();
    });

    it('should not throw on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { sendSMS } = require('../services/sms');
      await expect(sendSMS('+447911000000', 'Hello')).resolves.not.toThrow();
    });
  });

  describe('sendPhoneVerificationSMS', () => {
    it('should send verification message with code', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const { sendPhoneVerificationSMS } = require('../services/sms');
      await sendPhoneVerificationSMS('+447911123456', '123456', '@testuser');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.content).toContain('123456');
      expect(body.content).toContain('@testuser');
      expect(body.content).toContain('verification');
    });
  });

  describe('sendLoginVerificationSMS', () => {
    it('should send login verification message', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const { sendLoginVerificationSMS } = require('../services/sms');
      await sendLoginVerificationSMS('+447911123456', '654321', '@user');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.content).toContain('654321');
      expect(body.content).toContain('login');
    });
  });

  describe('sendPasswordResetSMS', () => {
    it('should send password reset message', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });

      const { sendPasswordResetSMS } = require('../services/sms');
      await sendPasswordResetSMS('+447911123456', 'RESET1', '@admin');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.content).toContain('RESET1');
      expect(body.content).toContain('reset');
    });
  });
});
