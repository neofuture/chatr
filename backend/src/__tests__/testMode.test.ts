describe('testMode module', () => {
  let isTestMode: typeof import('../lib/testMode').isTestMode;
  let setTestMode: typeof import('../lib/testMode').setTestMode;
  let getTestBypassCode: typeof import('../lib/testMode').getTestBypassCode;

  beforeEach(() => {
    jest.resetModules();
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

    it('should return true after enabling', () => {
      setTestMode(true);
      expect(isTestMode()).toBe(true);
    });

    it('should return false in production even if enabled', () => {
      setTestMode(true);
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(isTestMode()).toBe(false);
      process.env.NODE_ENV = origEnv;
    });
  });

  describe('setTestMode', () => {
    it('should return true when setting in non-production', () => {
      expect(setTestMode(true)).toBe(true);
    });

    it('should return false when setting in production', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(setTestMode(true)).toBe(false);
      process.env.NODE_ENV = origEnv;
    });

    it('should disable test mode', () => {
      setTestMode(true);
      expect(isTestMode()).toBe(true);
      setTestMode(false);
      expect(isTestMode()).toBe(false);
    });

    it('should log enable/disable message', () => {
      const logSpy = jest.spyOn(console, 'log');
      setTestMode(true);
      expect(logSpy).toHaveBeenCalled();
      setTestMode(false);
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('getTestBypassCode', () => {
    it('should return null when test mode is off', () => {
      expect(getTestBypassCode()).toBeNull();
    });

    it('should return bypass code when test mode is on', () => {
      setTestMode(true);
      expect(getTestBypassCode()).toBe('000000');
    });

    it('should return null in production even if enabled', () => {
      setTestMode(true);
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      expect(getTestBypassCode()).toBeNull();
      process.env.NODE_ENV = origEnv;
    });
  });
});
