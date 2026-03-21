jest.mock('../lib/redis', () => ({
  redis: { set: jest.fn().mockResolvedValue('OK'), get: jest.fn().mockResolvedValue(null) },
}));

describe('testMode module', () => {
  let isTestMode: typeof import('../lib/testMode').isTestMode;
  let setTestMode: typeof import('../lib/testMode').setTestMode;
  let getTestBypassCode: typeof import('../lib/testMode').getTestBypassCode;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('../lib/redis', () => ({
      redis: { set: jest.fn().mockResolvedValue('OK'), get: jest.fn().mockResolvedValue(null) },
    }));
    process.env.NODE_ENV = 'test';
    const mod = require('../lib/testMode');
    isTestMode = mod.isTestMode;
    setTestMode = mod.setTestMode;
    getTestBypassCode = mod.getTestBypassCode;
  });

  describe('isTestMode', () => {
    it('should return false by default', () => {
      expect(isTestMode()).toBe(false);
    });

    it('should return true after enabling', async () => {
      await setTestMode(true);
      expect(isTestMode()).toBe(true);
    });

    it('should return false in production even if enabled', async () => {
      await setTestMode(true);
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(isTestMode()).toBe(false);
      process.env.NODE_ENV = origEnv;
    });
  });

  describe('setTestMode', () => {
    it('should return true when setting in non-production', async () => {
      expect(await setTestMode(true)).toBe(true);
    });

    it('should return false when setting in production', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(await setTestMode(true)).toBe(false);
      process.env.NODE_ENV = origEnv;
    });

    it('should disable test mode', async () => {
      await setTestMode(true);
      expect(isTestMode()).toBe(true);
      await setTestMode(false);
      expect(isTestMode()).toBe(false);
    });

    it('should log enable/disable message', async () => {
      const logSpy = jest.spyOn(console, 'log');
      await setTestMode(true);
      expect(logSpy).toHaveBeenCalled();
      await setTestMode(false);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('getTestBypassCode', () => {
    it('should return null when test mode is off', () => {
      expect(getTestBypassCode()).toBeNull();
    });

    it('should return bypass code when test mode is on', async () => {
      await setTestMode(true);
      expect(getTestBypassCode()).toBe('000000');
    });

    it('should return null in production even if enabled', async () => {
      await setTestMode(true);
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(getTestBypassCode()).toBeNull();
      process.env.NODE_ENV = origEnv;
    });
  });
});
