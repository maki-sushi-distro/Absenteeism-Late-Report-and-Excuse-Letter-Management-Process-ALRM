import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPostLoginPath } from "../api/authSecurity";
import { exchangeOtpCode, getOtpTokenFromResponse } from "../api/otp";
import { useAuth } from "../context/AuthContext";

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [error, setError] = useState(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function completeLogin() {
      try {
        if (searchParams.get("error")) {
          throw new Error("Login failed. Please use your official LV email account.");
        }

        let token = searchParams.get("token") || searchParams.get("otp_token") || searchParams.get("verification_token");
        if (!token) {
          const code = searchParams.get("code");
          if (!code) throw new Error("Missing login token.");
          token = getOtpTokenFromResponse(await exchangeOtpCode(code));
        }

        const user = await loginWithToken(token);
        navigate(getPostLoginPath(user), { replace: true });
      } catch (loginError) {
        setError(loginError.message || "Login failed. Please try again.");
      }
    }

    completeLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
        <div className="grid gap-4">
          <p role="alert">{error}</p>
          <a className="font-semibold text-primary" href="/login">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">
      <p role="status">Restoring your session...</p>
    </div>
  );
}
