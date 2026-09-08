import { useEffect, useRef, useState } from "react";
import { startGoogleLogin } from "@/api/auth";
import { API_URL, clearToken, setToken } from "@/api/client";
import { getAuthErrorMessage } from "@/auth/authErrors";
import { useAuth } from "@/auth/useAuth";
import { ErrorState } from "@/components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function AuthCallback({ navigate }) {
  const { refreshUser } = useAuth();
  const [error, setError] = useState("");
  const handledCallbackRef = useRef(false);

  function chooseAnotherAccount() {
    try {
      startGoogleLogin();
    } catch {
      setError("Google Sign-In could not be started.");
    }
  }

  useEffect(() => {
    async function completeLogin() {
      if (handledCallbackRef.current) {
        return;
      }

      handledCallbackRef.current = true;

      const params = new URLSearchParams(window.location.search);
      const callbackError = params.get("error");
      const token = params.get("token");
      const code = params.get("code");

      if (callbackError) {
        clearToken();
        setError(getAuthErrorMessage(callbackError));
        return;
      }

      if (code) {
        clearToken();
        window.location.assign(
          `${API_URL}/auth/google/callback${window.location.search}`,
        );
        return;
      }

      if (!token) {
        clearToken();
        setError(getAuthErrorMessage("missing_token"));
        return;
      }

      setToken(token);
      const user = await refreshUser();

      if (user) {
        navigate("/");
      } else {
        clearToken();
        setError(getAuthErrorMessage("session_failed"));
      }
    }

    completeLogin();
  }, [navigate, refreshUser]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-4">
          <ErrorState title="Sign in could not be completed" message={error} />
          <Button type="button" onClick={chooseAnotherAccount} className="w-full">
            Sign in with another Google account
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-sm text-slate-600">
        <Spinner />
        Completing secure sign in
      </div>
    </main>
  );
}
