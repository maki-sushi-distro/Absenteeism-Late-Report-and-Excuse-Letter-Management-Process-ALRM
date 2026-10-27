import { getAdminDashboard } from "@/api/admin";
import { getCollection } from "@/api/collections";
import { useApiResource } from "@/hooks/useApiResource";
import ActivityTable from "@/components/common/ActivityTable";
import { flagActivity } from "./overviewData";

const loadClasses = () => getCollection("/admin/classes");
export default function AdminActivityLog() {
  const dashboard = useApiResource(getAdminDashboard);
  const classes = useApiResource(loadClasses);
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold">Activity Log</h1><p className="mt-2 text-sm text-slate-500">Recent escalated request activity across programs.</p></header>
    <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm leading-6 text-blue-900">The current service supplies up to ten recent escalations. Full submission, follow-up, and decision audit history is not available here.</p>
    {classes.error && <p role="status" className="text-sm text-slate-500">Instructor details could not be loaded. <button type="button" onClick={classes.reload} className="text-blue-800 underline">Retry instructor details</button></p>}
    <ActivityTable rows={flagActivity(dashboard.data?.recent_flags, classes.data || [])} loading={dashboard.loading || classes.loading} error={dashboard.error} onRetry={dashboard.reload} />
  </div>;
}
