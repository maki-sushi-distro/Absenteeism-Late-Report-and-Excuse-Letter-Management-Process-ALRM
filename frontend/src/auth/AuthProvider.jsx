import { useCallback, useEffect, useMemo, useState } from "react";
import { getCurrentUser, logout as logoutRequest } from "@/api/auth";
import { getToken } from "@/api/client";
import { AuthContext } from "./useAuth";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError("");

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (requestError) {
      setUser(null);
      setError(requestError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshUser();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refreshUser]);

  const value = useMemo(
    () => ({ user, loading, error, refreshUser, logout }),
    [user, loading, error, refreshUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
