import { Navigate } from "react-router-dom";
import { getPostLoginPath } from "@/api/authSecurity";
import SessionStatus from "@/components/SessionStatus";
import { useAuth } from "@/context/AuthContext";
import SchoolIdentityPanel from "./SchoolIdentityPanel";
import SignedOutMessage from "./SignedOutMessage";

export default function SignedOut() {
  const { user, loading, sessionError } = useAuth();
  if (!user && (loading || sessionError)) return <SessionStatus />;
  if (user) return <Navigate to={getPostLoginPath(user)} replace />;

  return <main className="grid min-h-screen bg-white text-slate-900 md:grid-cols-[48%_52%]">
    <SchoolIdentityPanel />
    <SignedOutMessage />
  </main>;
}
