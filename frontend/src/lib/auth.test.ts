import {
  getAuthToken,
  getStoredUser,
  isAuthenticated,
  storeAuth,
  clearAuth,
  cleanupInvalidAuth,
  StoredUser,
} from './auth';

const mockStorage: Record<string, string> = {};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key: string) => mockStorage[key] ?? null),
      setItem: jest.fn((key: string, val: string) => { mockStorage[key] = val; }),
      removeItem: jest.fn((key: string) => { delete mockStorage[key]; }),
      clear: jest.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
    },
    writable: true,
  });
});

const validUser: StoredUser = {
  id: 'u1',
  email: 'a@b.c',
  username: 'alice',
  emailVerified: true,
};

describe('auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  });

  describe('getAuthToken', () => {
    it('should return the token from localStorage', () => {
      mockStorage['token'] = 'tok123';
      expect(getAuthToken()).toBe('tok123');
    });

    it('should return null when no token exists', () => {
      expect(getAuthToken()).toBeNull();
    });

    it('should return null for "undefined" string', () => {
      mockStorage['token'] = 'undefined';
      expect(getAuthToken()).toBeNull();
    });

    it('should return null for "null" string', () => {
      mockStorage['token'] = 'null';
      expect(getAuthToken()).toBeNull();
    });

    it('should return null when localStorage throws', () => {
      (localStorage.getItem as jest.Mock).mockImplementationOnce(() => { throw new Error('boom'); });
      expect(getAuthToken()).toBeNull();
    });
  });

  describe('getStoredUser', () => {
    it('should parse and return valid user data', () => {
      mockStorage['user'] = JSON.stringify(validUser);
      expect(getStoredUser()).toEqual(validUser);
    });

    it('should return null when no user stored', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('should return null for "undefined" string', () => {
      mockStorage['user'] = 'undefined';
      expect(getStoredUser()).toBeNull();
    });

    it('should return null for "null" string', () => {
      mockStorage['user'] = 'null';
      expect(getStoredUser()).toBeNull();
    });

    it('should return null when user data is missing required fields', () => {
      mockStorage['user'] = JSON.stringify({ email: 'a@b.c' });
      expect(getStoredUser()).toBeNull();
    });

    it('should return null when user data is invalid JSON', () => {
      mockStorage['user'] = 'not-json{';
      expect(getStoredUser()).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when both token and valid user exist', () => {
      mockStorage['token'] = 'tok';
      mockStorage['user'] = JSON.stringify(validUser);
      expect(isAuthenticated()).toBe(true);
    });

    it('should return false when token is missing', () => {
      mockStorage['user'] = JSON.stringify(validUser);
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when user is missing', () => {
      mockStorage['token'] = 'tok';
      expect(isAuthenticated()).toBe(false);
    });

    it('should return false when both are missing', () => {
      expect(isAuthenticated()).toBe(false);
    });
  });

  describe('storeAuth', () => {
    it('should save token and user JSON to localStorage', () => {
      storeAuth('tok', validUser);

      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'tok');
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(validUser));
    });

    it('should throw when localStorage.setItem fails', () => {
      (localStorage.setItem as jest.Mock).mockImplementationOnce(() => { throw new Error('quota'); });

      expect(() => storeAuth('tok', validUser))
        .toThrow('Failed to store authentication data');
    });
  });

  describe('clearAuth', () => {
    it('should remove token and user from localStorage', () => {
      mockStorage['token'] = 'tok';
      mockStorage['user'] = 'data';

      clearAuth();

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should not throw when localStorage.removeItem fails', () => {
      (localStorage.removeItem as jest.Mock).mockImplementationOnce(() => { throw new Error('err'); });
      expect(() => clearAuth()).not.toThrow();
    });
  });

  describe('cleanupInvalidAuth', () => {
    it('should clear auth when token is "undefined"', () => {
      mockStorage['token'] = 'undefined';
      cleanupInvalidAuth();
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should clear auth when token is "null"', () => {
      mockStorage['token'] = 'null';
      cleanupInvalidAuth();
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should clear auth when user is "undefined"', () => {
      mockStorage['user'] = 'undefined';
      cleanupInvalidAuth();
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should clear auth when user is "null"', () => {
      mockStorage['user'] = 'null';
      cleanupInvalidAuth();
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should clear auth when user JSON is missing required fields', () => {
      mockStorage['user'] = JSON.stringify({ email: 'x' });
      cleanupInvalidAuth();
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should clear auth when user JSON is unparseable', () => {
      mockStorage['user'] = '{bad json';
      cleanupInvalidAuth();
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should not clear auth when data is valid', () => {
      mockStorage['token'] = 'good-token';
      mockStorage['user'] = JSON.stringify(validUser);
      cleanupInvalidAuth();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });

    it('should not clear auth when nothing is stored', () => {
      cleanupInvalidAuth();
      expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
  });
});
