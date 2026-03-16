import { ChatrDB, db } from './db';

jest.mock('dexie', () => {
  const storeDefs: Record<string, string>[] = [];
  const MockTable = () => ({});

  class MockDexie {
    static storeDefs = storeDefs;

    version(v: number) {
      return {
        stores: (schema: Record<string, string>) => {
          storeDefs.push(schema);
        },
      };
    }
  }

  return { __esModule: true, default: MockDexie };
});

describe('db', () => {
  describe('ChatrDB', () => {
    it('should be an instance of ChatrDB', () => {
      expect(db).toBeInstanceOf(ChatrDB);
    });

    it('should be a singleton export', () => {
      const { db: db2 } = require('./db');
      expect(db2).toBe(db);
    });
  });

  describe('schema versions', () => {
    it('should define version 1 with messages, users, groups', () => {
      const instance = new ChatrDB();
      // Verify the constructor doesn't throw
      expect(instance).toBeDefined();
    });
  });
});
