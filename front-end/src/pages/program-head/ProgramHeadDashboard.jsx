import { useEffect, useState } from "react";
import { getFlaggedStudents, getProgramHeadDashboard, getProgramHeadRequests } from "@/api/programHead";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function ProgramHeadDashboard({ view = "dashboard" }) {
  const [dashboard, setDashboard] = useState(null);
  const [flags, setFlags] = useState([]);
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData(nextStatus = statusFilter) {
    setLoading(true);
    setError("");
    try {
      const filters = nextStatus ? { status: nextStatus } : {};
      const [dashboardData, flagData, requestData] = await Promise.all([
        getProgramHeadDashboard(),
        getFlaggedStudents(filters),
        getProgramHeadRequests(filters),
      ]);
      setDashboard(dashboardData);
      setFlags(flagData || []);
      setRequests(requestData || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadData(""), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeFilter(value) {
    setStatusFilter(value);
    loadData(value);
  }

  if (loading) return <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-slate-600"><Spinner />Loading program records</div>;

  const showMetrics = view === "dashboard";
  const showFlags = view === "dashboard" || view === "flagged";
  const showRequests = view === "dashboard" || view === "requests";

  return (
    <div className="space-y-6">
      {error ? <ErrorState message={error} /> : null}
      {showMetrics ? <section className="grid gap-4 md:grid-cols-4">
        <article className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Program</p><p className="mt-2 text-xl font-bold">{dashboard?.program_name || "Assigned program"}</p></article>
        <article className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Students</p><p className="mt-2 text-3xl font-bold">{dashboard?.total_students || 0}</p></article>
        <article className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Warnings</p><p className="mt-2 text-3xl font-bold">{dashboard?.warning_count || 0}</p></article>
        <article className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">IR cases</p><p className="mt-2 text-3xl font-bold">{dashboard?.ir_count || 0}</p></article>
      </section> : null}
      {showFlags ? <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Flagged students</h2>
          <div className="flex gap-2">{["", "open", "resolved"].map((value) => <Button key={value || "all"} size="sm" variant={statusFilter === value ? "default" : "outline"} onClick={() => changeFilter(value)}>{value || "All"}</Button>)}</div>
        </div>
        {flags.length === 0 ? <EmptyState title="No flagged students" /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {flags.map((flag) => <article key={flag.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex justify-between gap-3"><span className="font-semibold">{flag.request?.enrollment?.student?.name || "Student"}</span><StatusBadge value={flag.status} /></div><p className="mt-2 text-sm text-slate-500">{flag.request?.enrollment?.class?.subject_name || "Class"}</p></article>)}
          </div>
        )}
      </section> : null}
      {showRequests ? <section>
        <h2 className="mb-3 text-lg font-semibold">Program requests</h2>
        {requests.length === 0 ? <EmptyState title="No program requests" /> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm"><tbody className="divide-y divide-slate-100">{requests.map((request) => <tr key={request.id}><td className="px-4 py-3 font-medium">{request.enrollment?.student?.name || "Student"}</td><td className="px-4 py-3">{request.enrollment?.class?.subject_name || "Class"}</td><td className="px-4 py-3 capitalize">{request.type}</td><td className="px-4 py-3"><StatusBadge value={request.status} /></td></tr>)}</tbody></table>
          </div>
        )}
      </section> : null}
    </div>
  );
}
