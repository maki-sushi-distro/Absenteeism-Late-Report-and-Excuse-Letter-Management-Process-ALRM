import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingSkeleton from "@/components/loading/LoadingSkeleton";
import { ErrorState } from "./ErrorState";
import { filterActivity } from "@/pages/auth/admin/overviewData";
import { paginateRecords } from "@/pages/auth/student/records/pagination";
import RequestPagination from "@/pages/auth/instructor/InstructorRequests/RequestPagination";

const field = "h-10 w-full rounded-md border border-[#9faed0] bg-white px-3 text-sm";
const actions = { Submitted: "border-orange-200 bg-orange-50 text-orange-700", "Followed up": "border-orange-200 bg-orange-50 text-orange-700", Flagged: "border-yellow-300 bg-yellow-50 text-yellow-900", Approved: "border-green-200 bg-green-50 text-green-700", Denied: "border-red-200 bg-red-50 text-red-700", Noted: "border-blue-200 bg-blue-50 text-blue-800" };

export default function ActivityTable({ rows = [], loading, error, onRetry, flagged = false, programLog = false }) {
  const [filters, setFilters] = useState({ action: "", subject: "", date: "" });
  const [page, setPage] = useState(1);
  const visible = filterActivity(rows, filters);
  const pagination = paginateRecords(visible, page);
  const subjects = [...new Map(rows.filter(row => row.classId).map(row => [row.classId, row.subject])).entries()];
  function change(key, value) { setFilters(current => ({ ...current, [key]: value })); setPage(1); }
  if (loading) return <LoadingSkeleton variant="table" columns={5} rows={6} label="Loading activity">{!programLog && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>)}</div>}</LoadingSkeleton>;
  if (error) return <div className="space-y-3"><ErrorState message={error} /><Button variant="outline" onClick={onRetry}>Retry</Button></div>;
  return <div className="space-y-5">
    {!programLog && <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[220px_260px_220px_auto]">
      <label className="grid gap-1.5 text-sm font-medium">Action<select className={field} value={filters.action} onChange={event => change("action", event.target.value)}><option value="">All actions</option>{Object.keys(actions).filter(action => rows.some(row => row.action === action)).map(action => <option key={action}>{action}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Subject<select className={field} value={filters.subject} onChange={event => change("subject", event.target.value)}><option value="">All subjects</option>{subjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="grid gap-1.5 text-sm font-medium">Date<Input className="h-10" type="date" value={filters.date} onChange={event => change("date", event.target.value)} /></label>
      <Button variant="outline" onClick={() => { setFilters({ action: "", subject: "", date: "" }); setPage(1); }}>Clear filters</Button>
    </div>}
    <div className="overflow-x-auto"><table className="w-full min-w-[760px] table-fixed text-left text-sm"><caption className="sr-only">{flagged ? "Flagged request activity" : "Request activity"}</caption><thead><tr className="border-b border-[#bccae5] text-[#203B82]">{(flagged ? ["Students", "Date", "Class", "Record", "Flagged by"] : programLog ? ["Students", "Date", "Requests", "Action", "Instructor"] : ["Date", "Student", "Request", "Action", "Instructor"]).map(label => <th key={label} scope="col" className="w-1/5 px-4 py-4 font-semibold">{label}</th>)}</tr></thead><tbody>
      {pagination.pageRecords.map(row => <tr key={row.id} className="border-b border-[#cbd6ed]">
        {(flagged ? [row.student, new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), row.subject, row.type, row.flaggedBy] : programLog ? [row.student, new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), row.type, row.action, row.instructor] : [new Date(row.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), row.student, row.type, row.action, row.instructor]).map((value, index) => <td key={index} className="break-words px-4 py-5">{!flagged && index === 3 ? <span className={`inline-flex min-w-24 justify-center rounded-md border px-2 py-1 text-xs font-medium ${actions[row.action] || "border-slate-200 bg-slate-50"}`}>{value}</span> : value || "Unavailable"}</td>)}
      </tr>)}
      {!visible.length && <tr><td colSpan={5} className="py-14 text-center text-slate-500">No activity matches these filters.</td></tr>}
    </tbody></table></div>
    <RequestPagination pagination={pagination} total={visible.length} onPage={setPage} />
  </div>;
}
