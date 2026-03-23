import type { Socket } from 'socket.io-client';
import { getApiBase } from '@/lib/api';

const DEFAULT_TIMEOUT = 4000;

/**
 * Emit a socket event with ack and return the response.
 * Returns `null` if the socket isn't connected, times out, or returns an error.
 */
export function socketRPC<T = any>(
  socket: Socket | null | undefined,
  event: string,
  data: Record<string, any> = {},
  timeout = DEFAULT_TIMEOUT,
): Promise<T | null> {
  return new Promise((resolve) => {
    if (!socket?.connected) { resolve(null); return; }
    const timer = setTimeout(() => resolve(null), timeout);
    socket.emit(event, data, (res: any) => {
      clearTimeout(timer);
      if (!res || res.error) { resolve(null); return; }
      resolve(res as T);
    });
  });
}

function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

/**
 * Socket-first call with REST fallback.
 * Tries the socket event first; if it fails/times out, falls back to the REST endpoint.
 */
export async function socketFirst<T = any>(
  socket: Socket | null | undefined,
  event: string,
  socketData: Record<string, any>,
  restMethod: string,
  restPath: string,
  restBody?: Record<string, any>,
  timeout?: number,
): Promise<T> {
  const result = await socketRPC<T>(socket, event, socketData, timeout);
  if (result !== null) return result;

  // HTTP fallback with 15s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  const opts: RequestInit = {
    method: restMethod,
    headers: authHeaders(),
    signal: controller.signal,
  };
  if (restBody && restMethod !== 'GET') {
    opts.body = JSON.stringify(restBody);
  }

  try {
    const res = await fetch(`${getApiBase()}${restPath}`, opts);
    clearTimeout(timeoutId);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.message || `Request failed: ${res.status}`);
    }
    return res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}
