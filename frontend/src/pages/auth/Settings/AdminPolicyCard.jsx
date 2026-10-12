import { AlertCircle, Settings } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import SettingsCard from "./SettingsCard";

const policies = [
  { label: "Late conversion", value: "3 late reports = 1 converted absence" },
  { label: "Warning threshold", value: "2 converted absences" },
  { label: "IR threshold", value: "3 converted absences" },
  { label: "Policy management", value: "Read-only in frontend" },
];

function AdminPolicyCard() {
  return <SettingsCard icon={Settings} title="Absenteeism & Late Policy"
    description="Current attendance policy behavior enforced by the backend.">
    <div className="grid gap-3 sm:grid-cols-2">
      {policies.map((policy) => <div key={policy.label} className="rounded-[5px] border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase text-slate-500">{policy.label}</p>
        <p className="mt-1 text-sm font-black text-slate-950">{policy.value}</p>
      </div>)}
    </div>
    <Alert className="mt-4 border-slate-200 bg-white">
      <AlertCircle className="size-4" /><AlertTitle>Policy settings endpoint not exposed</AlertTitle>
      <AlertDescription>These values were verified from the existing backend attendance logic. There is no registered API route for editing policy settings.</AlertDescription>
    </Alert>
  </SettingsCard>;
}

export default AdminPolicyCard;
