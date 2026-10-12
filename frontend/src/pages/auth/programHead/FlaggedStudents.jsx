import { useState } from "react";
import { getFlaggedStudents } from "@/api/dashboardData";
import DataTable from "@/components/dashboard/DataTable";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useApiResource } from "@/hooks/useApiResource";
import ProgramHeadPageLayout from "./ProgramHeadPageLayout";

const columns = [
  { key: "student", label: "Student", render: (row) => row.request?.enrollment?.student?.name || "—" },
  { key: "class", label: "Class", render: (row) => row.request?.enrollment?.class?.subject_name || "—" },
  { key: "request", label: "Request", render: (row) => <span className="capitalize">{row.request?.type || "—"}</span> },
  { key: "flagged_date", label: "Flagged", render: (row) => row.flagged_date ? new Date(row.flagged_date).toLocaleDateString() : "—" },
  { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
];

function FlaggedStudents() {
  const [status, setStatus] = useState("");
  const resource = useApiResource(getFlaggedStudents, status);
  return <ProgramHeadPageLayout>
    <PageHeading title="Flagged Students" description="Students requiring follow-up" action={<select aria-label="Filter flag status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">All flags</option><option value="open">Open</option><option value="resolved">Resolved</option></select>} />
    <ResourceState {...resource} onRetry={resource.reload}><DataTable columns={columns} rows={resource.data || []} empty="No flagged students found." /></ResourceState>
  </ProgramHeadPageLayout>;
}

export default FlaggedStudents;
