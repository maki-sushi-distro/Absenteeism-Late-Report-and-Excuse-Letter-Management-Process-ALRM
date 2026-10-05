import { apiFetch } from './client.js';

const pendingRequests = new Map();
const SESSION_TIMEOUT_MS = 60000;
const SESSION_ATTEMPTS = 2;

function isRetryableSessionError(error) {
  return (
    error instanceof TypeError ||
    error?.name === 'AbortError' ||
    error?.name === 'TimeoutError'
  );
}

async function requestSessionUser(token) {
  let lastError;

  for (let attempt = 0; attempt < SESSION_ATTEMPTS; attempt += 1) {
    try {
      return await apiFetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
      if (!isRetryableSessionError(error) || attempt === SESSION_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

export function getSessionUser(token) {
  if (pendingRequests.has(token)) return pendingRequests.get(token);

  const request = (async () => {
    const response = await requestSessionUser(token);

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
