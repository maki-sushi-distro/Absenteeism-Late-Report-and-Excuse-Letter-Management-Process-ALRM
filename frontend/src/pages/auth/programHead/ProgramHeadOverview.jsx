import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, BookOpen, GraduationCap, TriangleAlert } from "lucide-react";
import { monthlyActivity, requestStudent } from "./programHeadData";

const panel = "border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

function Summary({ dashboard, flags }) {
  const metrics = [
    { label: "Classes", value: dashboard?.total_classes, icon: BookOpen },
    { label: "Total students", value: dashboard?.total_students, icon: GraduationCap },
    { label: "Students at risk", value: new Set(flags.filter((flag) => flag.status === "open").map((flag) => flag.request?.enrollment?.student?.id || flag.id)).size, icon: TriangleAlert },
  ];
  return <div className="grid gap-4 sm:grid-cols-3">{metrics.map(({ label, value, icon: Icon }) => (
    <div key={label} className={`${panel} flex items-center justify-between rounded-md p-5`}>
      <div><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{value ?? "—"}</p></div>
      <Icon className="size-7 text-blue-900 dark:text-blue-300" aria-hidden="true" />
    </div>
  ))}</div>;
}

function Activity({ requests }) {
  const months = monthlyActivity(requests);
  const maximum = Math.max(1, ...months.flatMap((item) => [item.absences, item.lates]));
  return <section className={`${panel} rounded-md p-5`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Absences and tardiness</h2><p className="text-sm text-slate-500 dark:text-slate-400">Submitted requests in the last six months</p></div><div className="flex gap-4 text-xs"><span><i className="mr-2 inline-block size-2 bg-rose-600" />Absences</span><span><i className="mr-2 inline-block size-2 bg-amber-500" />Lates</span></div></div>
    <div className="mt-8 grid h-48 grid-cols-6 gap-3 border-b border-slate-200 dark:border-slate-700">{months.map((month) => <div key={month.key} className="flex min-h-0 flex-col items-center justify-end gap-2"><div className="flex min-h-0 w-full max-w-20 flex-1 items-end justify-center gap-1"><div title={`${month.absences} absences in ${month.label}`} className="w-1/3 bg-rose-600" style={{ height: `${month.absences ? Math.max(5, month.absences / maximum * 100) : 0}%` }} /><div title={`${month.lates} lates in ${month.label}`} className="w-1/3 bg-amber-500" style={{ height: `${month.lates ? Math.max(5, month.lates / maximum * 100) : 0}%` }} /></div><span className="text-xs text-slate-500 dark:text-slate-400">{month.label}</span></div>)}</div>
  </section>;
}

function RiskPreview({ flags }) {
  return <section className={`${panel} rounded-md p-5`}><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Students at risk</h2><Link className="inline-flex items-center gap-1 text-sm font-medium text-blue-800 hover:underline dark:text-blue-300" to="/program-head/flagged">View all <ArrowRight className="size-4" /></Link></div>
    <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">{flags.length ? flags.slice(0, 5).map((flag) => <div key={flag.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span className="font-medium">{requestStudent(flag.request || {})}</span><span className="text-slate-500 dark:text-slate-400">{flag.request?.enrollment?.class?.subject_name || "Class unavailable"}</span><span className="capitalize text-rose-700 dark:text-rose-300">{flag.status}</span></div>) : <p className="py-4 text-sm text-slate-500 dark:text-slate-400">No escalated students in this program.</p>}</div>
  </section>;
}

export default function ProgramHeadOverview({ dashboard, flags, requests }) {
  const { user } = useAuth();
  return <div className="space-y-6"><header><p className="text-sm font-medium text-blue-900 dark:text-blue-300">Program head</p><h1 className="mt-1 text-2xl font-bold">Welcome back, {user?.name || "Program Head"}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{dashboard?.program_name || "Your program"} overview</p></header><Summary dashboard={dashboard} flags={flags} /><Activity requests={requests} /><RiskPreview flags={flags} /></div>;
}
