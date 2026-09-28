import { apiFetch } from './client.js';

const pendingRequests = new Map();

export function getSessionUser(token) {
  if (pendingRequests.has(token)) return pendingRequests.get(token);

  const request = (async () => {
    const response = await apiFetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      const error = new Error(
        response.status === 401
          ? 'Your session has expired. Please sign in again.'
          : 'Unable to check your session. Please try again.',
      );
      error.status = response.status;
      throw error;
    }

    const { data } = await response.json();
    if (!data?.id) throw new Error('Unable to check your session. Please try again.');
    return data;
  })().finally(() => pendingRequests.delete(token));

  pendingRequests.set(token, request);
  return request;
}
