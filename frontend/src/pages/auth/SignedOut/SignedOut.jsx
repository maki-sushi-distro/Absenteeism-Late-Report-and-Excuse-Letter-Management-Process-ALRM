import { Navigate } from "react-router-dom";
import { getPostLoginPath } from "@/api/authSecurity";
import SessionStatus from "@/components/SessionStatus";
import { useAuth } from "@/context/AuthContext";
import SchoolIdentityPanel from "./SchoolIdentityPanel";
import SignedOutMessage from "./SignedOutMessage";
import MobileAuthBrand from "@/components/auth/MobileAuthBrand";

export default function SignedOut() {
  const { user, loading, sessionError } = useAuth();
  if (!user && (loading || sessionError)) return <SessionStatus />;
  if (user) return <Navigate to={getPostLoginPath(user)} replace />;

  return <main className="flex min-h-svh flex-col bg-[#1c356a] text-slate-900 md:grid md:min-h-screen md:grid-cols-[48%_52%] md:bg-white">
    <MobileAuthBrand />
    <SchoolIdentityPanel />
    <SignedOutMessage />
  </main>;
}
