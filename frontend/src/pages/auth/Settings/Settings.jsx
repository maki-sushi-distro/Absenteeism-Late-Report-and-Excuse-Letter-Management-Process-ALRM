import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePreviewRole } from "@/hooks/usePreviewRole";
import AdminPolicyCard from "./AdminPolicyCard";
import NotificationCard from "./NotificationCard";
import ProfileCard from "./ProfileCard";
import SecurityCard from "./SecurityCard";
import SettingsLayout from "./SettingsLayout";
import TestingRoleCard from "./TestingRoleCard";
import UnknownRoleState from "./UnknownRoleState";
import UnsupportedActionAlert from "./UnsupportedActionAlert";
import { normalizeRole, ROLE_CONFIG } from "./settingsConfig";

function Settings() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { activeRole, canPreviewRoles, setActiveRole } = usePreviewRole(user);
  const [notice, setNotice] = useState(null);
  const normalizedRole = normalizeRole(activeRole);
  const config = normalizedRole ? ROLE_CONFIG[normalizedRole] : null;
  const showUnsupported = (title, description) => setNotice({ title, description });

  if (loading) return <SettingsLayout role={activeRole}>
    <p className="text-sm font-medium text-slate-600">Loading settings...</p>
  </SettingsLayout>;
  if (!config) return <UnknownRoleState role={activeRole} />;

  return <SettingsLayout role={activeRole}>
    <div className="mx-auto grid max-w-6xl gap-5">
      <div><h1 className="text-2xl font-black tracking-normal text-slate-950">{config.pageTitle}</h1>
        <p className="mt-1 text-sm font-medium text-slate-600">{config.pageDescription}</p></div>
      <UnsupportedActionAlert notice={notice} />
      <div className="grid gap-5">
        {canPreviewRoles && <TestingRoleCard activeRole={activeRole} onChange={setActiveRole}
          onOpenDashboard={() => navigate("/dashboard")} />}
        <ProfileCard user={user} role={activeRole} config={config} />
        {normalizedRole === "administrator" && <AdminPolicyCard />}
        <NotificationCard config={config} onUnsupported={showUnsupported} />
        <SecurityCard user={user} onUnsupported={showUnsupported} />
      </div>
    </div>
  </SettingsLayout>;
}

export default Settings;
