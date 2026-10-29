import { getProgramHeadAuditLogs } from "@/api/programHead";
import { useApiResource } from "@/hooks/useApiResource";
import ActivityTable from "@/components/common/ActivityTable";
import { auditActivity } from "../admin/overviewData";

export default function ProgramHeadActivityLog() {
  const logs = useApiResource(getProgramHeadAuditLogs);
  return <div className="space-y-4">
    <h1 className="sr-only">Activity Log</h1>
    <ActivityTable rows={auditActivity(logs.data || [])} loading={logs.loading} error={logs.error} onRetry={logs.reload} auditLog />
  </div>;
}
