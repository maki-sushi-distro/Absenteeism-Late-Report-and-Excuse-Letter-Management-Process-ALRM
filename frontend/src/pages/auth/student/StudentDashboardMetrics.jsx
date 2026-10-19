import { Clock, UserRoundX } from "lucide-react";
import AttendanceThreshold from "./dashboard/AttendanceThreshold";
import { requestTotals } from "./dashboard/studentOverview";

function RecordedMetric({ title, value, icon: Icon, children }) {
  return <article className="flex min-h-[225px] min-w-0 flex-col overflow-hidden rounded-[7px] border border-[#c9c6c6] bg-white shadow-[0_1px_1px_#0000000d] dark:border-slate-700 dark:bg-slate-900">
    <div className="flex flex-1 items-start justify-between gap-2 px-[9px] pt-[17px] pb-4">
      <div className="min-w-0"><h2 className="max-w-24 text-[14px] font-normal leading-[18px]">{title}</h2><p className="mt-[25px] text-[28px] font-semibold leading-[34px] tabular-nums">{value}</p></div>
      <Icon className="mt-[7px] size-5 shrink-0 text-[#717171] dark:text-slate-400" aria-hidden="true" />
    </div>
    <p className="flex min-h-[70px] items-center bg-[#f6f6f6] px-[9px] py-3 text-[11px] leading-[13px] text-[#464646] dark:bg-slate-800/60 dark:text-slate-300"><span>{children}</span></p>
  </article>;
}

export default function StudentDashboardMetrics({ requests, attendance, classes, alertsEnabled = true }) {
  const totals = requestTotals(requests);
  return <section aria-label="Attendance overview" className="mt-8 grid gap-5 @[640px]:grid-cols-[minmax(0,1fr)_minmax(0,2.19fr)_minmax(0,1fr)] @[800px]:gap-[26px]">
    <RecordedMetric title="Absences Recorded" value={totals.absences} icon={UserRoundX}>
      Across {classes.length} enrolled {classes.length === 1 ? "course" : "courses"}<br />
      ({totals.excused} excused, {totals.unexcused} unexcused{totals.pending ? `, ${totals.pending} pending` : ""})
    </RecordedMetric>
    <AttendanceThreshold attendance={attendance} alertsEnabled={alertsEnabled} />
    <RecordedMetric title="Lates Recorded" value={totals.lates} icon={Clock}>Total recorded tardiness across all registered schedules.</RecordedMetric>
  </section>;
}
