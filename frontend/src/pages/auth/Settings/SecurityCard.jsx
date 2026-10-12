import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import SettingsCard from "./SettingsCard";
import { valueOrFallback } from "./settingsConfig";

function SecurityCard({ user, onUnsupported }) {
  return <SettingsCard icon={ShieldCheck} title="Account & Security"
    description="Security information for your authenticated ALRM session.">
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-[5px] border border-slate-200 p-4">
        <div className="flex items-center gap-2 text-slate-950"><Mail className="size-4 text-[#203b82]" /><p className="text-sm font-black">Google Account</p></div>
        <p className="mt-2 text-sm text-slate-600">{valueOrFallback(user?.email)} is managed through LV Google OAuth.</p>
      </div>
      <div className="rounded-[5px] border border-slate-200 p-4">
        <div className="flex items-center gap-2 text-slate-950"><KeyRound className="size-4 text-[#203b82]" /><p className="text-sm font-black">Password</p></div>
        <p className="mt-2 text-sm text-slate-600">Password changes are handled by the LV Google account provider.</p>
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button type="button" variant="outline" className="h-9 rounded-[5px] border-slate-300 font-bold text-[#0b367f]"
        onClick={() => onUnsupported("Password change unavailable",
          "No change-password API route exists in the current backend. This login flow uses Google OAuth.")}>Change Password</Button>
      <Button type="button" variant="outline" className="h-9 rounded-[5px] border-slate-300 font-bold text-[#0b367f]"
        onClick={() => onUnsupported("Security settings unavailable",
          "No account-security settings endpoint is registered for the frontend to update.")}>Account Security</Button>
    </div>
  </SettingsCard>;
}

export default SecurityCard;
