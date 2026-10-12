import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SettingsLayout from "./SettingsLayout";
import { valueOrFallback } from "./settingsConfig";

function UnknownRoleState({ role }) {
  return <SettingsLayout role={role}>
    <div className="max-w-3xl">
      <h1 className="text-2xl font-black tracking-normal text-slate-950">Settings</h1>
      <Alert variant="destructive" className="mt-5">
        <AlertCircle className="size-4" /><AlertTitle>Settings unavailable</AlertTitle>
        <AlertDescription>Your account role ({valueOrFallback(role, "unknown")}) is not supported by the Settings page. Please contact an administrator.</AlertDescription>
      </Alert>
    </div>
  </SettingsLayout>;
}

export default UnknownRoleState;
