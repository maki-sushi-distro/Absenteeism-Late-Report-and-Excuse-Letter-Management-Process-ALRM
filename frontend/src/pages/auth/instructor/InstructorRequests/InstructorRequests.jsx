import { useState } from "react";
import { getInstructorRequests } from "@/api/dashboardData";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import { useApiResource } from "@/hooks/useApiResource";
import InstructorPageLayout from "../InstructorPageLayout";
import DecisionPanel from "./DecisionPanel";
import RequestTable from "./RequestTable";

function InstructorRequests() {
  const resource = useApiResource(getInstructorRequests);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const rows = (resource.data || []).filter((request) => !filter || request.status === filter);

  return <InstructorPageLayout>
    <PageHeading title="Class Requests" description="Review absence and late requests for your classes" action={<select aria-label="Filter by status" value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="noted">Noted</option><option value="invalid">Invalid</option></select>} />
    <ResourceState {...resource} onRetry={resource.reload}>
      <RequestTable requests={rows} onReview={setSelected} />
    </ResourceState>
    {selected && <DecisionPanel request={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); resource.reload(); }} />}
  </InstructorPageLayout>;
}

export default InstructorRequests;
