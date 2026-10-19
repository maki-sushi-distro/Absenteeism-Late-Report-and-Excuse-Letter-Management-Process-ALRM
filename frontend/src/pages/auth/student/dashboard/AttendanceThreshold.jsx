import { CircleAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { attendanceStanding, ATTENDANCE_POLICY } from "./studentOverview";
import AttendanceGauge from "./AttendanceGauge";

const appearances = {
  safe: { title: "Within Attendance Threshold", label: "Good Standing", color: "#16a34a", text: "text-green-700 dark:text-green-400" },
  warning: { title: "Approaching Threshold Warning", label: "Cautionary Standing", color: "#ff7113", text: "text-[#aa4808] dark:text-orange-400" },
  IR: { title: "Incident Report Threshold Reached", label: "Incident Report", color: "#dc2626", text: "text-red-700 dark:text-red-400" },
};

export default function AttendanceThreshold({ attendance, alertsEnabled = true }) {
  const { converted, status, subject, hasData } = attendanceStanding(attendance);
  const appearance = appearances[status];
  const Icon = status === "safe" ? ShieldCheck : TriangleAlert;
  const remaining = Math.max(ATTENDANCE_POLICY.incidentReport - converted, 0);
  return <article className="flex min-h-[225px] min-w-0 flex-col overflow-hidden rounded-[7px] border border-[#c9c6c6] bg-white shadow-[0_1px_1px_#0000000d] dark:border-slate-700 dark:bg-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-[17px] pt-[9px]">
      <h2 className="flex items-center gap-2 text-[14px] font-normal leading-5">Attendance Threshold Used <span title="Policy is applied separately to each class: warning at 2 converted absences, incident report at 3."><CircleAlert className="size-[19px] shrink-0 text-[#717171] dark:text-slate-400" aria-hidden="true" /></span></h2>
      <span className="flex items-center gap-0.5 rounded bg-orange-50 px-1 py-0.5 text-[10px] leading-3 text-[#ff7113] dark:bg-orange-950/50 dark:text-orange-300"><span className="size-1 rounded-full bg-current" />Policy Threshold</span>
    </div>
    <div className="flex flex-1 items-center gap-4 px-3 py-[17px]">
      <AttendanceGauge converted={converted} hasData={hasData} color={appearance.color} />
      <div className="min-w-0 flex-1">
        <h3 className={`flex items-center gap-1.5 text-[12px] font-normal leading-[15px] ${appearance.text}`}><Icon className="size-5 shrink-0" aria-hidden="true" />{!alertsEnabled ? "Attendance Overview" : hasData ? appearance.title : "No Attendance Recorded"}</h3>
        <p title={subject || undefined} className="mt-2 break-words text-[12px] leading-[14px] text-[#464646] dark:text-slate-300">{hasData && alertsEnabled ? remaining ? `You are ${remaining} converted ${remaining === 1 ? "absence" : "absences"} away from the incident report threshold of 3.` : "You have reached the incident report threshold of 3 converted absences." : "Warning at 2 converted absences; incident report at 3."} Every 3 lates count as 1 absence.</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9px] leading-3 text-[#827b7b] dark:text-slate-400">
          <span className="flex items-center gap-1"><span aria-hidden="true" className="size-[7px] rounded-full" style={{ backgroundColor: appearance.color }} />Used: {hasData ? converted : "\u2014"}</span>
          <span className="flex items-center gap-1"><span aria-hidden="true" className="size-[7px] rounded-full bg-[#c4c4c4] dark:bg-slate-500" />IR threshold: {ATTENDANCE_POLICY.incidentReport}</span>
        </div>
      </div>
    </div>
    <p className="flex min-h-[54px] items-center gap-1 bg-[#f6f6f6] px-[9px] py-3 text-[12px] leading-4 dark:bg-slate-800/60">Status: <span className={status === "warning" ? "text-[#ed6a11] dark:text-orange-400" : appearance.text}>{hasData ? appearance.label : "Not yet available"}</span></p>
  </article>;
}
