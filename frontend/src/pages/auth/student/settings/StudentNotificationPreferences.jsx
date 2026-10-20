import { BellRing } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import useStudentPreferences from "../useStudentPreferences";

const options = [
  { key: "requestUpdates", label: "Excuse letter status updates", description: "Show your submitted requests and instructor decisions on the dashboard." },
  { key: "thresholdAlerts", label: "Threshold warning alerts", description: "Show attendance warnings when an enrolled class reaches the attendance threshold." },
  { key: "email", label: "Email notifications", description: "Email delivery is managed by your school and cannot be changed here.", disabled: true },
];

export default function StudentNotificationPreferences({ userId }) {
  const { preferences, updatePreference, error } = useStudentPreferences(userId);
  return <section aria-labelledby="student-preferences-title" className="border-y border-slate-300 px-0 py-10 dark:border-slate-700 sm:px-8">
    <div className="flex items-start gap-2">
      <BellRing className="mt-1 size-5 shrink-0 text-blue-500 dark:text-blue-400" aria-hidden="true" />
      <div><h2 id="student-preferences-title" className="text-lg font-semibold">Notification Preferences</h2><p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Choose which attendance alerts and excuse request decisions you want to see.</p></div>
    </div>
    <div className="mt-5 grid gap-5 sm:pl-6">
      {options.map((option) => <div key={option.key} className="flex items-center justify-between gap-5">
        <div className="min-w-0"><label htmlFor={`student-preference-${option.key}`} className="cursor-pointer text-sm font-semibold">{option.label}</label><p id={`student-preference-${option.key}-description`} className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{option.description}</p></div>
        <Switch id={`student-preference-${option.key}`} checked={preferences[option.key] ?? false} disabled={option.disabled || !userId} onCheckedChange={(checked) => updatePreference(option.key, checked)} aria-describedby={`student-preference-${option.key}-description`} className="data-checked:bg-[#173568] dark:data-checked:bg-blue-500" />
      </div>)}
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">On-screen preferences are saved automatically for your account on this browser.</p>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  </section>;
}
