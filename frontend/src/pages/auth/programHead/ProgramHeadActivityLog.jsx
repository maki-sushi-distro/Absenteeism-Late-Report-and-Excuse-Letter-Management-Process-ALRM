import { getProgramHeadAuditLogs, getProgramHeadRequests } from "@/api/programHead";
import { useApiResource } from "@/hooks/useApiResource";
import ActivityTable from "@/components/common/ActivityTable";
import { auditActivity } from "../admin/overviewData";

export default function ProgramHeadActivityLog() {
  const logs = useApiResource(getProgramHeadAuditLogs);
  const requests = useApiResource(getProgramHeadRequests);
  function reload() { logs.reload(); requests.reload(); }
  return <div className="space-y-4">
    <h1 className="sr-only">Activity Log</h1>
    <ActivityTable rows={auditActivity(logs.data || [], requests.data || [])} loading={logs.loading || requests.loading} error={logs.error || requests.error} onRetry={reload} />
  </div>;
}
