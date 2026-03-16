import { saveAuthToken, clearAuthToken } from './authUtils';

const mockStorage: Record<string, string> = {};

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn((key: string) => mockStorage[key] ?? null),
      setItem: jest.fn((key: string, val: string) => { mockStorage[key] = val; }),
      removeItem: jest.fn((key: string) => { delete mockStorage[key]; }),
      clear: jest.fn(),
    },
    writable: true,
  });
});

describe('authUtils', () => {
  let dispatchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
    dispatchSpy = jest.spyOn(window, 'dispatchEvent');
  });

  afterEach(() => {
    dispatchSpy.mockRestore();
  });

  describe('saveAuthToken', () => {
    it('should store token and user data in localStorage', () => {
      const userData = { id: '1', username: 'alice' };
      saveAuthToken('tok', userData);

      expect(localStorage.setItem).toHaveBeenCalledWith('token', 'tok');
      expect(localStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(userData));
    });

    it('should dispatch userLoggedIn event', () => {
      saveAuthToken('tok', { id: '1' });

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      const event = dispatchSpy.mock.calls[0][0] as Event;
      expect(event.type).toBe('userLoggedIn');
    });
  });

  describe('clearAuthToken', () => {
    it('should remove token and user from localStorage', () => {
      mockStorage['token'] = 'tok';
      mockStorage['user'] = '{}';

      clearAuthToken();

      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('user');
    });

    it('should dispatch userLoggedOut event', () => {
      clearAuthToken();

      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      const event = dispatchSpy.mock.calls[0][0] as Event;
      expect(event.type).toBe('userLoggedOut');
    });
  });
});
