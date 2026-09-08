import { useState } from "react";
import { LogIn, ShieldCheck } from "lucide-react";
import { startGoogleLogin } from "@/api/auth";
import { API_URL } from "@/api/client";
import { getAuthErrorMessage } from "@/auth/authErrors";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/common/ErrorState";
import { AccessDenied } from "@/pages/AccessDenied";

export function Login({ initialError = "" }) {
  const [localError, setLocalError] = useState("");
  const params = new URLSearchParams(window.location.search);
  const callbackError = params.get("error");
  const error = localError || initialError || getAuthErrorMessage(callbackError);

  if (callbackError === "invalid_domain") {
    return <AccessDenied message={getAuthErrorMessage(callbackError)} />;
  }

  function handleGoogleLogin() {
    try {
      startGoogleLogin();
    } catch {
      setLocalError("Google Sign-In could not be started.");
    }
  }

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex min-h-56 items-end bg-[#0B1428] p-8 text-white lg:min-h-screen lg:p-12">
        <div className="max-w-md">
          <div className="mb-6 flex size-12 items-center justify-center rounded-md bg-white text-base font-bold text-[#0B1428]">
            AL
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Absence and tardiness requests, routed clearly.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            La Verdad Christian College students and staff use Google Workspace
            sign in to access the right ALRM dashboard.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1 text-sm text-slate-600">
              <ShieldCheck className="size-4 text-[#0B1428]" aria-hidden="true" />
              Google SSO
            </div>
            <h2 className="text-3xl font-bold text-[#0B1428]">Welcome</h2>
            <p className="mt-2 text-sm text-slate-500">
              Sign in using your authorized LV Google account.
            </p>
          </div>

          {error ? <div className="mb-5"><ErrorState message={error} /></div> : null}

          <Button type="button" size="lg" onClick={handleGoogleLogin} className="h-11 w-full">
            <LogIn className="size-4" aria-hidden="true" />
            Continue with Google
          </Button>

          <p className="mt-5 text-center text-xs text-slate-500">
            Only authorized accounts can access this system.
          </p>
          <p className="mt-3 text-center text-xs text-slate-400">
            API: {API_URL}
          </p>
        </div>
      </section>
    </main>
  );
}
