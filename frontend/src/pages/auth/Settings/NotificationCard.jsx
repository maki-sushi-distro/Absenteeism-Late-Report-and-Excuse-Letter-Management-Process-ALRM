import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import SettingsCard from "./SettingsCard";

const channels = [
  { label: "In-app Notifications", description: "Alerts inside the ALRM system." },
  { label: "School Email", description: "Messages sent to the authenticated LV email account." },
];

function NotificationCard({ config, onUnsupported }) {
  return <SettingsCard icon={Bell} title={config.preferencesTitle} description={config.preferencesDescription}>
    <div className="grid gap-3">
      {channels.map((channel) => <div key={channel.label}
        className="flex flex-col gap-3 rounded-[5px] border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950">{channel.label}</p>
          <p className="mt-1 text-sm text-slate-600">{channel.description}</p>
        </div>
        <div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-500">Managed by system</span>
          <Switch checked={false} disabled aria-label={channel.label} /></div>
      </div>)}
    </div>
    <Button type="button" variant="outline" className="mt-4 h-9 rounded-[5px] border-slate-300 font-bold text-[#0b367f]"
      onClick={() => onUnsupported("Notification preferences unavailable",
        "The backend has notification records, but no preference endpoint is registered for reading or saving per-user notification channels.")}>
      Manage Notifications
    </Button>
  </SettingsCard>;
}

export default NotificationCard;
