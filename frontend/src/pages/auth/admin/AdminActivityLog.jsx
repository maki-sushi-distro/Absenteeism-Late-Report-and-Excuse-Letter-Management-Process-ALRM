import { getAdminAuditLogs } from "@/api/admin";
import { useApiResource } from "@/hooks/useApiResource";
import ActivityTable from "@/components/common/ActivityTable";
import { auditActivity } from "./overviewData";

export default function AdminActivityLog() {
  const logs = useApiResource(getAdminAuditLogs);
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold">Activity Log</h1><p className="mt-2 text-sm text-slate-500">Request activity across programs.</p></header>
    <ActivityTable rows={auditActivity(logs.data || [])} loading={logs.loading} error={logs.error} onRetry={logs.reload} auditLog />
  </div>;
}
