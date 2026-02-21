/**
 * Utility to save auth token and notify WebSocket to reconnect
 */
export function saveAuthToken(token: string, userData: any) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));

  // Dispatch custom event to notify WebSocketProvider
  window.dispatchEvent(new Event('userLoggedIn'));

  console.log('✅ Auth token saved, WebSocket will reconnect');
}

/**
 * Utility to clear auth token and notify WebSocket to disconnect
 */
export function clearAuthToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  // Dispatch custom event to notify WebSocketProvider
  window.dispatchEvent(new Event('userLoggedOut'));

  console.log('✅ Auth token cleared, WebSocket will disconnect');
}

