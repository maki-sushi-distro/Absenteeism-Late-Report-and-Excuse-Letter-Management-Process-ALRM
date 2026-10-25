import { BellRing } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import useNotificationPreferences from "@/hooks/useNotificationPreferences";

export default function NotificationPreferences({ userId, role = "student" }) {
  const student = role === "student";
  const prefix = student ? "student" : "notification";
  const { preferences, updatePreference, error } = useNotificationPreferences(userId, role);
  const options = [
    { key: "requestUpdates", label: student ? "Excuse letter status updates" : "Request activity updates", description: student ? "Show your submitted requests and instructor decisions on the dashboard." : "Show class requests, decisions, and follow-up notifications." },
    { key: "thresholdAlerts", label: student ? "Threshold warning alerts" : "Attendance threshold alerts", description: student ? "Show attendance warnings when an enrolled class reaches the attendance threshold." : "Show attendance warnings and incident report notifications for your classes or program." },
    { key: "email", label: "Email notifications", description: "Email delivery is managed by your school and cannot be changed here.", disabled: true },
  ];
  return <section aria-labelledby={`${prefix}-preferences-title`} className="border-y border-slate-300 px-0 py-10 sm:px-8">
    <div className="flex items-start gap-2">
      <BellRing className="mt-1 size-5 shrink-0 text-blue-500" aria-hidden="true" />
      <div><h2 id={`${prefix}-preferences-title`} className="text-lg font-semibold">Notification Preferences</h2><p className="mt-1 text-sm leading-relaxed text-slate-600">Choose which attendance alerts and request updates you want to see.</p></div>
    </div>
    <div className="mt-5 grid gap-5 sm:pl-6">
      {options.map(option => <div key={option.key} className="flex items-center justify-between gap-5">
        <div className="min-w-0"><label htmlFor={`${prefix}-preference-${option.key}`} className="cursor-pointer text-sm font-semibold">{option.label}</label><p id={`${prefix}-preference-${option.key}-description`} className="mt-1 text-sm leading-relaxed text-slate-600">{option.description}</p></div>
        <Switch id={`${prefix}-preference-${option.key}`} checked={preferences[option.key] ?? false} disabled={option.disabled || !userId} onCheckedChange={checked => updatePreference(option.key, checked)} aria-describedby={`${prefix}-preference-${option.key}-description`} className="data-checked:bg-[#173568]" />
      </div>)}
      <p className="text-sm leading-relaxed text-slate-600">On-screen preferences are saved automatically for your account on this browser.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  </section>;
}
