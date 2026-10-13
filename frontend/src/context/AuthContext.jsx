import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { apiFetch, getToken, setToken, subscribeToTokenChanges } from '../api/client';
import { clearPendingOtp } from '../api/otp';
import { getSessionUser } from '../api/session';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const token = useSyncExternalStore(subscribeToTokenChanges, getToken, () => null);
  const [session, setSession] = useState({ token: null, user: null, error: '', loading: false });
  const requestVersion = useRef(0);

  const loadUser = useCallback((nextToken) => {
    const version = ++requestVersion.current;
    if (!nextToken) return Promise.resolve(null);

    return getSessionUser(nextToken).then((user) => {
      if (getToken() !== nextToken) return null;

      if (version === requestVersion.current) {
        clearPendingOtp();
        setSession({ token: nextToken, user, error: '', loading: false });
      }
      return user;
    }, () => {
      if (getToken() === nextToken && version === requestVersion.current) {
        setSession((current) => ({
          token: nextToken,
          user: current.token === nextToken ? current.user : null,
          error: 'We could not reach your account. Your saved session has been kept. Please try again.',
          loading: false,
        }));
      }
      return null;
    });
  }, []);

  useEffect(() => {
    if (token) loadUser(token);
    return () => { requestVersion.current += 1; };
  }, [loadUser, token]);

  async function refreshUser({ silent = false } = {}) {
    if (!silent) {
      setSession((current) => ({ ...current, loading: true, error: '' }));
    }
    return loadUser(getToken());
  }

  async function loginWithToken(nextToken) {
    if (!nextToken) throw new Error('Missing login token.');
    setToken(nextToken);
    const user = await loadUser(nextToken);
    if (!user) throw new Error('Unable to confirm your session. Please try again.');
    clearPendingOtp();
    return user;
  }

  async function logout() {
    const request = apiFetch('/api/logout', {
      method: 'POST',
      signal: AbortSignal.timeout(10000),
    });
    requestVersion.current += 1;
    setToken(null);
    clearPendingOtp();
    setSession({ token: null, user: null, error: '', loading: false });
    try {
      await request;
    } catch {
      // The local session is already cleared if the server is unavailable.
    }
  }

  const currentSession = Boolean(token) && session.token === token;
  const user = currentSession ? session.user : null;
  const loading = Boolean(token) && (!currentSession || session.loading);
  const sessionError = currentSession ? session.error : '';

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, loginWithToken, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Keep the provider hook colocated with its context for existing consumers.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
