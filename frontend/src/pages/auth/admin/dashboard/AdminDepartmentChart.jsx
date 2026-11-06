import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { programShortName } from "@/lib/programs";
import { generateAdminReport } from "@/api/adminReports";
import { Skeleton } from "@/components/ui/skeleton";
import { departmentWeekRows, schoolWeek } from "../reports/reportData.js";
import { chartProgramTick } from "./chartLabels.js";

export default function AdminDepartmentChart({ programs = [] }) {
  const [weeksAgo, setWeeksAgo] = useState(0);
  const week = schoolWeek(new Date(), weeksAgo);
  const key = JSON.stringify(week);
  const cachedWeeks = useRef(new Map());
  const [revision, setRevision] = useState(0);
  const [report, setReport] = useState({ key: "", loading: true, data: null, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setReport(current => ({ key, loading: true, data: current.key === key ? current.data : cachedWeeks.current.get(key) || null, error: "" }));
      generateAdminReport(JSON.parse(key), { signal: controller.signal }).then(
      data => { if (!controller.signal.aborted) { cachedWeeks.current.set(key, data); setReport({ key, loading: false, data, error: "" }); } },
      failure => { if (!controller.signal.aborted) setReport(current => ({ key, loading: false, data: current.key === key ? current.data : null, error: failure.message || "Weekly reports could not be loaded." })); },
      );
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [key, revision]);
  useEffect(() => {
    const refreshVisible = () => { if (!document.hidden) setRevision(value => value + 1); };
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    const interval = window.setInterval(refreshVisible, 5 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.clearInterval(interval);
    };
  }, []);
  function refresh() {
    setRevision(value => value + 1);
  }
  function changeWeek(index) {
    if (weeksAgo === index) return;
    const nextKey = JSON.stringify(schoolWeek(new Date(), index));
    const data = cachedWeeks.current.get(nextKey);
    setWeeksAgo(index);
    setReport({ key: nextKey, loading: !data, data: data || null, error: "" });
  }
  const data = departmentWeekRows(programs, report.data?.rows || [], week).map(row => ({ ...row, name: programShortName(row.name) }));
  return <section aria-labelledby="department-chart-title" className="min-w-0 rounded-md border border-[#D0D0D0] bg-white p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 id="department-chart-title" className="text-base font-semibold">Absences and Tardiness by Department</h2><p className="mt-1 text-xs text-slate-500">{week.date_from} – {week.date_to}</p></div>
      <div className="flex gap-3 text-xs text-slate-600"><span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#ED2532]" />Absences</span><span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-sm bg-[#FF7814]" />Lates</span></div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Weekly report period">{["This week", "Last week"].map((label, index) => <button key={label} type="button" aria-pressed={weeksAgo === index} onClick={() => changeWeek(index)} className={`rounded-md border px-3 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-[#203B82] ${weeksAgo === index ? "border-[#203B82] bg-blue-50 text-[#203B82]" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{label}</button>)}<button type="button" onClick={refresh} disabled={report.loading} className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-blue-800 disabled:opacity-50">{report.loading ? "Refreshing…" : "Refresh"}</button></div>
    {report.error && report.key === key && <div role="alert" className="mt-3 text-sm text-red-700"><p>{report.error}{report.data ? " Showing previously loaded totals." : ""}</p><button type="button" onClick={refresh} className="text-blue-800 underline">Retry weekly reports</button></div>}
    {report.key !== key || (report.loading && !report.data) ? <div role="status" aria-label="Loading weekly reports" className="mt-4 h-64"><Skeleton className="h-full w-full" /></div> : report.data ? <div className="relative mt-4 h-64" aria-busy={report.loading}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 600, height: 256 }}>
        <BarChart data={data} margin={{ top: 10, right: 8, bottom: 10, left: -24 }}>
          <XAxis dataKey="name" tickFormatter={chartProgramTick} tickLine={false} axisLine={{ stroke: "#94A3B8" }} tick={{ fill: "#475569", fontSize: 11 }} interval={0} />
          <YAxis domain={[0, dataMax => Math.max(3, dataMax)]} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748B", fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="absences" name="Absences" fill="#ED2532" isAnimationActive={false} />
          <Bar dataKey="lates" name="Lates" fill="#FF7814" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      {!data.some(row => row.absences > 0 || row.lates > 0) && <p className="pointer-events-none absolute inset-x-10 top-1/2 text-center text-sm text-slate-500">No absence or late reports for this week.</p>}
      <ul className="sr-only">{data.map(row => <li key={row.name}>{row.name}: {row.absences} absence reports; {row.lates} late reports.</li>)}</ul>
    </div> : null}
    <p className="mt-3 text-xs text-slate-500">Counts use absence/late occurrence dates (Start Date), not submission dates, for the current semester and school year. Department means the subject/class program, not the student's home department. Totals refresh every 5 minutes while this page is visible.</p>
  </section>;
}
