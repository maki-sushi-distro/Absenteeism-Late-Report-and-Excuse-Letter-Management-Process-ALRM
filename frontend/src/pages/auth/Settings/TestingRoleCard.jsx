import { AlertCircle, Shuffle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PREVIEW_ROLE_OPTIONS } from "@/lib/previewRole";
import SettingsCard from "./SettingsCard";

function TestingRoleCard({ activeRole, onChange, onOpenDashboard }) {
  return <SettingsCard icon={Shuffle} title="Testing Dashboard Role"
    description="Choose which dashboard interface to preview with this student account.">
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="grid gap-2">
        <Label htmlFor="testing-dashboard-role" className="text-xs font-bold text-slate-700 dark:text-slate-300">Dashboard Role</Label>
        <select id="testing-dashboard-role" value={activeRole} onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full rounded-[5px] border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
          {PREVIEW_ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
        </select>
      </div>
      <Button type="button" onClick={onOpenDashboard}
        className="h-10 rounded-[5px] bg-[#203b82] px-5 font-bold text-white hover:bg-[#172e68]">Open Dashboard</Button>
    </div>
    <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertCircle className="size-4" /><AlertTitle>Frontend testing mode</AlertTitle>
      <AlertDescription>Your authenticated backend role remains Student. Student requests use the real API; privileged role APIs remain protected by the backend.</AlertDescription>
    </Alert>
  </SettingsCard>;
}

export default TestingRoleCard;
