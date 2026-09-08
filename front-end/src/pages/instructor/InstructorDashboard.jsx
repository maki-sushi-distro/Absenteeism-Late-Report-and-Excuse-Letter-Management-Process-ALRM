import { useEffect, useState } from "react";
import { decideRequest, getInstructorDashboard, getInstructorRequests } from "@/api/instructor";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

export function InstructorDashboard({ view = "dashboard" }) {
  const [dashboard, setDashboard] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [dashboardData, requestData] = await Promise.all([getInstructorDashboard(), getInstructorRequests()]);
      setDashboard(dashboardData);
      setRequests(requestData || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleDecision(requestId, status) {
    setWorkingId(requestId);
    setError("");
    try {
      await decideRequest(requestId, status);
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorkingId(null);
    }
  }

  if (loading) return <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-slate-600"><Spinner />Loading instructor dashboard</div>;

  const showMetrics = view === "dashboard";
  const showRequests = view === "dashboard" || view === "requests";

  return (
    <div className="space-y-6">
      {error ? <ErrorState message={error} /> : null}
      {showMetrics ? <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Classes</p><p className="mt-2 text-3xl font-bold">{dashboard?.total_classes || 0}</p></article>
        <article className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Students</p><p className="mt-2 text-3xl font-bold">{dashboard?.total_students || 0}</p></article>
        <article className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Pending requests</p><p className="mt-2 text-3xl font-bold">{dashboard?.pending_requests?.length || 0}</p></article>
      </section> : null}
      {showRequests ? <section>
        <h2 className="mb-3 text-lg font-semibold">Requests for review</h2>
        {requests.length === 0 ? <EmptyState title="No class requests" /> : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td className="px-4 py-3 font-medium">{request.enrollment?.student?.name || "Student"}</td>
                    <td className="px-4 py-3">{request.enrollment?.class?.subject_name || "Class"}</td>
                    <td className="px-4 py-3 capitalize">{request.type}</td>
                    <td className="px-4 py-3"><StatusBadge value={request.status} /></td>
                    <td className="px-4 py-3">
                      {request.status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          {["approved", "noted", "invalid"].map((status) => (
                            <Button key={status} size="sm" variant={status === "invalid" ? "destructive" : "outline"} disabled={workingId === request.id} onClick={() => handleDecision(request.id, status)}>{status}</Button>
                          ))}
                        </div>
                      ) : "Recorded"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section> : null}
    </div>
  );
}
