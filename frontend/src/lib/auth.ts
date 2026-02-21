/**
 * Authentication utility functions for localStorage management
 */

export interface StoredUser {
  id: string;
  email: string;
  username: string;
  emailVerified: boolean;
}

/**
 * Safely get auth token from localStorage
 * Returns null if token is invalid or missing
 */
export const getAuthToken = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      return null;
    }
    return token;
  } catch (e) {
    console.error('[Auth] Failed to get token:', e);
    return null;
  }
};

/**
 * Safely get user data from localStorage
 * Returns null if user data is invalid or missing
 */
export const getStoredUser = (): StoredUser | null => {
  try {
    const userData = localStorage.getItem('user');
    if (!userData || userData === 'undefined' || userData === 'null') {
      return null;
    }
    const user = JSON.parse(userData);
    // Validate user has required fields
    if (!user.id || !user.username) {
      console.warn('[Auth] User data missing required fields');
      return null;
    }
    return user;
  } catch (e) {
    console.error('[Auth] Failed to parse user data:', e);
    return null;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const user = getStoredUser();
  return !!(token && user);
};

/**
 * Store authentication data
 */
export const storeAuth = (token: string, user: StoredUser): void => {
  try {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    console.log('[Auth] Stored auth data for:', user.username);
  } catch (e) {
    console.error('[Auth] Failed to store auth data:', e);
    throw new Error('Failed to store authentication data');
  }
};

/**
 * Clear all authentication data
 */
export const clearAuth = (): void => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    console.log('[Auth] Cleared auth data');
  } catch (e) {
    console.error('[Auth] Failed to clear auth data:', e);
  }
};

/**
 * Clean up invalid auth data
 * Removes data if it's corrupted or invalid
 */
export const cleanupInvalidAuth = (): void => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  let needsCleanup = false;

  // Check for invalid token
  if (token && (token === 'undefined' || token === 'null')) {
    needsCleanup = true;
  }

  // Check for invalid user data
  if (userData && (userData === 'undefined' || userData === 'null')) {
    needsCleanup = true;
  }

  // Try to parse user data
  if (userData && userData !== 'undefined' && userData !== 'null') {
    try {
      const user = JSON.parse(userData);
      if (!user.id || !user.username) {
        needsCleanup = true;
      }
    } catch (e) {
      needsCleanup = true;
    }
  }

  if (needsCleanup) {
    console.warn('[Auth] Found invalid auth data, cleaning up');
    clearAuth();
  }
};

