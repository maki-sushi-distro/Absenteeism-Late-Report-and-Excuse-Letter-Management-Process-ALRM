import { useSearchParams } from "react-router-dom";
import { getCollection } from "@/api/collections";
import { useApiResource } from "@/hooks/useApiResource";
import ActivityTable from "@/components/common/ActivityTable";
import { flagActivity, requestActivity } from "../admin/overviewData";

const loadRequests = () => getCollection("/program-head/requests");
const loadFlags = () => getCollection("/program-head/students/flagged");

export default function ProgramHeadActivityLog() {
  const [params, setParams] = useSearchParams();
  const flagged = params.get("tab") === "flagged";
  const requests = useApiResource(loadRequests);
  const flags = useApiResource(loadFlags);
  const loading = requests.loading || (flagged && flags.loading);
  const error = requests.error || (flagged && flags.error);
  const classes = (requests.data || []).map(request => request.enrollment?.class).filter(Boolean);
  function retry() { requests.reload(); if (flagged) flags.reload(); }
  return <div className="space-y-4">
    <h1 className="sr-only">Activity Log</h1>
    <div role="tablist" aria-label="Activity categories" className="flex gap-2">{["submitted", "flagged"].map(tab => {
      const selected = (tab === "flagged") === flagged;
      return <button key={tab} type="button" role="tab" id={`activity-tab-${tab}`} aria-selected={selected} aria-controls="activity-panel" onClick={() => setParams({ tab })} className={`border-b-2 px-4 py-3 text-base font-semibold capitalize ${selected ? "border-[#203B82] text-[#203B82]" : "border-transparent text-slate-500"}`}>{tab}</button>;
    })}</div>
    <section role="tabpanel" id="activity-panel" aria-labelledby={`activity-tab-${flagged ? "flagged" : "submitted"}`}>
      <ActivityTable key={flagged ? "flagged" : "submitted"} rows={flagged ? flagActivity(flags.data || [], classes) : requestActivity(requests.data || [])} programLog flagged={flagged} loading={loading} error={error} onRetry={retry} />
    </section>
  </div>;
}
