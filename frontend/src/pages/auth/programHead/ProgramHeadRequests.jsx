import { useState } from "react";
import { getProgramHeadRequests } from "@/api/dashboardData";
import DataTable from "@/components/dashboard/DataTable";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useApiResource } from "@/hooks/useApiResource";
import ProgramHeadPageLayout from "./ProgramHeadPageLayout";

const columns = [
  { key: "student", label: "Student", render: (row) => row.enrollment?.student?.name || "—" },
  { key: "class", label: "Class", render: (row) => row.enrollment?.class?.subject_name || "—" },
  { key: "type", label: "Type", render: (row) => <span className="capitalize">{row.type}</span> },
  { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
  { key: "reviewer", label: "Reviewed by", render: (row) => row.reviewer?.name || "—" },
];

function ProgramHeadRequests() {
  const [status, setStatus] = useState("");
  const resource = useApiResource(getProgramHeadRequests, status);
  return <ProgramHeadPageLayout>
    <PageHeading title="Program Requests" description="Late and absence requests in your program" action={<select aria-label="Filter request status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="noted">Noted</option><option value="invalid">Invalid</option></select>} />
    <ResourceState {...resource} onRetry={resource.reload}><DataTable columns={columns} rows={resource.data || []} empty="No requests found." /></ResourceState>
  </ProgramHeadPageLayout>;
}

export default ProgramHeadRequests;
