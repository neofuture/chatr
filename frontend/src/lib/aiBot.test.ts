import { AI_BOT_USER_ID, isAIBot } from './aiBot';

describe('aiBot', () => {
  describe('AI_BOT_USER_ID', () => {
    it('should be a non-empty string', () => {
      expect(typeof AI_BOT_USER_ID).toBe('string');
      expect(AI_BOT_USER_ID.length).toBeGreaterThan(0);
    });

    it('should fall back to default UUID when env var is not set', () => {
      expect(AI_BOT_USER_ID).toBe('a4629855-ea4c-40b7-b58d-49af22debc5c');
    });
  });

  describe('isAIBot', () => {
    it('should return true for the AI bot user ID', () => {
      expect(isAIBot(AI_BOT_USER_ID)).toBe(true);
    });

    it('should return false for a different user ID', () => {
      expect(isAIBot('some-other-user-id')).toBe(false);
    });

    it('should return false for an empty string', () => {
      expect(isAIBot('')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isAIBot(AI_BOT_USER_ID.toUpperCase())).toBe(false);
    });
  });
});
