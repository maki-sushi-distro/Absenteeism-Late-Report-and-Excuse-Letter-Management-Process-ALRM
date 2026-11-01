import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { getPendingOtpToken, getPendingOtpUserId } from "@/api/otp";
import LandingPage from "./LandingPage";

export default function Home() {
  const { user, logoutDestination } = useAuth();
  let pendingOtp = false;
  try { pendingOtp = Boolean(getPendingOtpToken() || getPendingOtpUserId()); }
  catch { /* The public page remains available when browser storage is blocked. */ }
  // Keep the public home available while session restoration runs in the background.
  if (user || logoutDestination || pendingOtp) {
    return <ProtectedRoute />;
  }
  return <LandingPage />;
}
