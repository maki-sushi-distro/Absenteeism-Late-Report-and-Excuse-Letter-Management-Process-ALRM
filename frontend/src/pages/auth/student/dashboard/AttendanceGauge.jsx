import { ATTENDANCE_POLICY } from "./studentOverview";

export default function AttendanceGauge({ converted, hasData, color }) {
  const percent = Math.min(converted / ATTENDANCE_POLICY.incidentReport, 1) * 100;
  const circumference = 2 * Math.PI * 48;
  return <div role="progressbar" aria-label="Highest converted absence count in an enrolled class" aria-valuemin={0} aria-valuemax={ATTENDANCE_POLICY.incidentReport} aria-valuenow={Math.min(converted, ATTENDANCE_POLICY.incidentReport)} aria-valuetext={hasData ? `${converted} converted absences; incident report at 3` : "No attendance data"} className="relative size-[108px] shrink-0">
    <svg aria-hidden="true" viewBox="0 0 108 108" className="size-[108px] [--gauge-track:#eceaea] dark:[--gauge-track:#334155]">
      <circle cx={54} cy={54} r={48} fill="none" stroke="var(--gauge-track)" strokeWidth={11} />
      {percent > 0 && <circle cx={54} cy={54} r={48} fill="none" stroke={color} strokeWidth={11} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - percent / 100)} transform="rotate(-90 54 54)" />}
    </svg>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
      <span className="text-[18px] font-bold leading-5">{hasData ? `${Math.round(percent)}%` : "\u2014"}</span>
      <span className="mt-0.5 text-[10px] leading-3">of IR threshold</span>
    </div>
  </div>;
}
