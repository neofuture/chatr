import { api } from './api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function jsonOk(body: object) {
  return { ok: true, json: () => Promise.resolve(body) } as Response;
}

function jsonError(body: object, status = 400) {
  return { ok: false, status, json: () => Promise.resolve(body) } as unknown as Response;
}

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('auth.register', () => {
    it('should POST to /api/auth/register and return data', async () => {
      const payload = { token: 'tok', user: { id: '1' } };
      mockFetch.mockResolvedValue(jsonOk(payload));

      const result = await api.auth.register('a@b.c', 'alice', 'pw', 'Alice', 'Smith');

      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'a@b.c',
          username: 'alice',
          password: 'pw',
          firstName: 'Alice',
          lastName: 'Smith',
        }),
      });
      expect(result).toEqual(payload);
    });

    it('should throw with server error message on failure', async () => {
      mockFetch.mockResolvedValue(jsonError({ error: 'Email taken' }));

      await expect(api.auth.register('a@b.c', 'alice', 'pw', 'A', 'S'))
        .rejects.toThrow('Email taken');
    });

    it('should throw generic message when server error has no message', async () => {
      mockFetch.mockResolvedValue(jsonError({}));

      await expect(api.auth.register('a@b.c', 'alice', 'pw', 'A', 'S'))
        .rejects.toThrow('Registration failed');
    });
  });

  describe('auth.login', () => {
    it('should POST credentials and return data', async () => {
      const payload = { token: 'tok', user: { id: '1' } };
      mockFetch.mockResolvedValue(jsonOk(payload));

      const result = await api.auth.login('a@b.c', 'pw');

      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.c', password: 'pw', twoFactorCode: undefined, verificationMethod: undefined }),
      });
      expect(result).toEqual(payload);
    });

    it('should include optional 2FA code and verification method', async () => {
      mockFetch.mockResolvedValue(jsonOk({ token: 't' }));

      await api.auth.login('a@b.c', 'pw', '123456', 'email');

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.twoFactorCode).toBe('123456');
      expect(body.verificationMethod).toBe('email');
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue(jsonError({ error: 'Bad creds' }));

      await expect(api.auth.login('a@b.c', 'pw')).rejects.toThrow('Bad creds');
    });

    it('should throw generic message when server error is empty', async () => {
      mockFetch.mockResolvedValue(jsonError({}));

      await expect(api.auth.login('a@b.c', 'pw')).rejects.toThrow('Login failed');
    });
  });

  describe('auth.setup2FA', () => {
    it('should POST userId and return setup data', async () => {
      const payload = { qrCode: 'data:image/png;base64,...', secret: 's3cret' };
      mockFetch.mockResolvedValue(jsonOk(payload));

      const result = await api.auth.setup2FA('user1');

      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user1' }),
      });
      expect(result).toEqual(payload);
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue(jsonError({ error: 'Not found' }));

      await expect(api.auth.setup2FA('x')).rejects.toThrow('Not found');
    });

    it('should throw generic message when server error is empty', async () => {
      mockFetch.mockResolvedValue(jsonError({}));

      await expect(api.auth.setup2FA('x')).rejects.toThrow('2FA setup failed');
    });
  });

  describe('auth.verify2FA', () => {
    it('should POST userId and code, return result', async () => {
      const payload = { verified: true };
      mockFetch.mockResolvedValue(jsonOk(payload));

      const result = await api.auth.verify2FA('user1', '123456');

      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user1', code: '123456' }),
      });
      expect(result).toEqual(payload);
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue(jsonError({ error: 'Invalid code' }));

      await expect(api.auth.verify2FA('user1', '000000')).rejects.toThrow('Invalid code');
    });

    it('should throw generic message when server error is empty', async () => {
      mockFetch.mockResolvedValue(jsonError({}));

      await expect(api.auth.verify2FA('u', 'c')).rejects.toThrow('2FA verification failed');
    });
  });

  describe('users.search', () => {
    it('should GET search results with auth header', async () => {
      const users = [{ id: '1', username: 'alice' }];
      mockFetch.mockResolvedValue(jsonOk(users));

      const result = await api.users.search('ali', 'mytoken');

      expect(mockFetch).toHaveBeenCalledWith(`${API_URL}/api/users/search?q=ali`, {
        headers: { Authorization: 'Bearer mytoken' },
      });
      expect(result).toEqual(users);
    });

    it('should throw on failure', async () => {
      mockFetch.mockResolvedValue({ ok: false } as Response);

      await expect(api.users.search('x', 'tok')).rejects.toThrow('Search failed');
    });
  });
});
