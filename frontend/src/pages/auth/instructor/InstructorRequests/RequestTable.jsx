import { Button } from "@/components/ui/button";
import DataTable from "@/components/dashboard/DataTable";
import StatusBadge from "@/components/dashboard/StatusBadge";

function RequestTable({ requests, onReview }) {
  const columns = [
    { key: "student", label: "Student", render: (row) => row.enrollment?.student?.name || "—" },
    { key: "class", label: "Class", render: (row) => row.enrollment?.class?.subject_name || "—" },
    { key: "type", label: "Type", render: (row) => <span className="capitalize">{row.type}</span> },
    { key: "reason", label: "Reason", render: (row) => <span className="block max-w-xs truncate" title={row.reason}>{row.reason}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
    { key: "action", label: "Action", render: (row) => row.status === "pending" ? <Button size="sm" variant="outline" onClick={() => onReview(row)}>Review</Button> : "—" },
  ];

  return <DataTable columns={columns} rows={requests} empty="No class requests found." />;
}

export default RequestTable;
