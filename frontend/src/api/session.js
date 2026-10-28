import { apiFetch, getSessionVersion } from './client.js';

const pendingRequests = new Map();
const SESSION_TIMEOUT_MS = 15000;
const SESSION_ATTEMPTS = 2;

function isRetryableSessionError(error) {
  return (
    error instanceof TypeError ||
    error?.name === 'AbortError' ||
    error?.name === 'TimeoutError'
  );
}

async function requestSessionUser() {
  let lastError;

  for (let attempt = 0; attempt < SESSION_ATTEMPTS; attempt += 1) {
    try {
      return await apiFetch('/api/me', {
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

export function getSessionUser() {
  const version = getSessionVersion();
  if (pendingRequests.has(version)) return pendingRequests.get(version);

  const request = (async () => {
    const response = await requestSessionUser();

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
  })().finally(() => pendingRequests.delete(version));

  pendingRequests.set(version, request);
  return request;
}
