const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = {
  auth: {
    register: async (email: string, username: string, password: string) => {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      return response.json();
    },

    login: async (email: string, password: string, twoFactorCode?: string, verificationMethod?: 'email' | 'sms') => {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, twoFactorCode, verificationMethod }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      return response.json();
    },

    setup2FA: async (userId: string) => {
      const response = await fetch(`${API_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '2FA setup failed');
      }

      return response.json();
    },

    verify2FA: async (userId: string, code: string) => {
      const response = await fetch(`${API_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '2FA verification failed');
      }

      return response.json();
    },
  },

  users: {
    search: async (query: string, token: string) => {
      const response = await fetch(`${API_URL}/api/users/search?q=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
  },
};

export default api;

