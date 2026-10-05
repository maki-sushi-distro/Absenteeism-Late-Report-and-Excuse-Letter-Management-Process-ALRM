import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { apiFetch, getToken, setToken, subscribeToTokenChanges } from '../src/api/client.js';
import { getSessionUser } from '../src/api/session.js';
import { getPostLoginPath, rememberAuthenticatedPage } from '../src/api/authSecurity.js';

const user = {
  id: 'student-one', role: 'student', program_id: 1,
  school_student_id: '2026-1001', year_level: '1st Year',
};

beforeEach(() => {
  const items = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => items.get(key) ?? null,
      setItem: (key, value) => items.set(key, String(value)),
      removeItem: (key) => items.delete(key),
    },
  });
  globalThis.window = new EventTarget();
});

afterEach(() => mock.restoreAll());

test('a fresh client module reuses the existing token after an update', async () => {
  setToken('existing-session');
  const freshClient = await import('../src/api/client.js?deployment=next');
  assert.equal(freshClient.getToken(), 'existing-session');
});

test('server validation is shared during concurrent session restoration', async () => {
  setToken('valid-session');
  const fetch = mock.method(globalThis, 'fetch', async (_url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer valid-session');
    return Response.json({ data: user });
  });
  const first = getSessionUser(getToken());
  const second = getSessionUser(getToken());
  assert.equal(first, second);
  assert.deepEqual(await first, user);
  assert.equal(fetch.mock.callCount(), 1);
});

test('a server outage keeps the token and allows retry with the same session', async () => {
  setToken('valid-session');
  let available = false;
  mock.method(globalThis, 'fetch', async () => available
    ? Response.json({ data: user })
    : new Response('', { status: 503 }));
  await assert.rejects(getSessionUser(getToken()), { status: 503 });
  assert.equal(getToken(), 'valid-session');
  available = true;
  assert.deepEqual(await getSessionUser(getToken()), user);
});

test('network failures and malformed responses do not erase the token', async () => {
  setToken('valid-session');
  const fetch = mock.method(globalThis, 'fetch', async () => { throw new TypeError('offline'); });
  await assert.rejects(getSessionUser(getToken()));
  assert.equal(getToken(), 'valid-session');
  fetch.mock.mockImplementation(async () => Response.json({ data: null }));
  await assert.rejects(getSessionUser(getToken()));
  assert.equal(getToken(), 'valid-session');
});

test('a transient network failure is retried before session restoration fails', async () => {
  setToken('valid-session');
  let attempts = 0;
  const fetch = mock.method(globalThis, 'fetch', async () => {
    attempts += 1;
    if (attempts === 1) throw new TypeError('cold start connection reset');
    return Response.json({ data: user });
  });

  assert.deepEqual(await getSessionUser(getToken()), user);
  assert.equal(fetch.mock.callCount(), 2);
  assert.equal(getToken(), 'valid-session');
});

test('a revoked token is removed and subscribers are notified', async () => {
  setToken('revoked-session');
  let changes = 0;
  const unsubscribe = subscribeToTokenChanges(() => { changes += 1; });
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 401 }));
  await assert.rejects(getSessionUser(getToken()), { status: 401 });
  assert.equal(getToken(), null);
  assert.equal(changes, 1);
  unsubscribe();
});

test('a delayed 401 cannot erase a newer login', async () => {
  setToken('old-session');
  let finish;
  mock.method(globalThis, 'fetch', () => new Promise((resolve) => { finish = resolve; }));
  const request = apiFetch('/api/me');
  setToken('new-session');
  finish(new Response('', { status: 401 }));
  await request;
  assert.equal(getToken(), 'new-session');
});

test('a request using a different credential cannot erase the current token', async () => {
  setToken('current-session');
  mock.method(globalThis, 'fetch', async () => new Response('', { status: 401 }));
  await apiFetch('/api/me', { headers: { Authorization: 'Bearer another-session' } });
  assert.equal(getToken(), 'current-session');
});

test('token listeners synchronize logout but ignore obsolete tab IDs', () => {
  let changes = 0;
  const unsubscribe = subscribeToTokenChanges(() => { changes += 1; });
  for (const key of ['alrm_active_session_id', 'auth_token', null]) {
    const event = new Event('storage');
    Object.defineProperty(event, 'key', { value: key });
    globalThis.window.dispatchEvent(event);
  }
  assert.equal(changes, 2);
  unsubscribe();
  setToken('new-session');
  assert.equal(changes, 2);
});

test('last page restores per account with its filters and fragment', () => {
  rememberAuthenticatedPage(user, '/student/records?status=valid#history');
  assert.equal(getPostLoginPath(user), '/student/records?status=valid#history');
  assert.equal(getPostLoginPath({ ...user, id: 'another-student' }), '/dashboard');
});

test('auth pages and external URLs cannot become a saved destination', () => {
  for (const path of ['https://example.com', '//example.com', '/\\example.com', '/',
    '/auth/callback?code=private', '/auth/otp', '/verify-otp', '/login', '/LOGIN/', '/complete-profile']) {
    globalThis.localStorage.setItem(`alrm_last_page:${user.id}`, path);
    assert.equal(getPostLoginPath(user), '/dashboard', path);
  }
});

test('saved navigation omits credentials and does not overwrite the last page on login', () => {
  rememberAuthenticatedPage(user, '/settings?token=private&status=saved#access_token=private');
  assert.equal(getPostLoginPath(user), '/settings?status=saved');
  rememberAuthenticatedPage(user, '/auth/callback?code=private');
  assert.equal(getPostLoginPath(user), '/settings?status=saved');
});

test('saved navigation cannot bypass login or incomplete profile setup', () => {
  rememberAuthenticatedPage(user, '/student/records');
  assert.equal(getPostLoginPath(null), '/login');
  assert.equal(getPostLoginPath({ id: user.id, role: 'student' }), '/complete-profile');
});
