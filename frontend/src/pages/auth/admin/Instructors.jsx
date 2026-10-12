import { Link } from "react-router-dom";
import { getAdminUsers } from "@/api/dashboardData";
import DataTable from "@/components/dashboard/DataTable";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useApiResource } from "@/hooks/useApiResource";
import AdminPageLayout from "./AdminPageLayout";

function loadInstructors() { return getAdminUsers("instructor"); }

const columns = [
  { key: "name", label: "Name" },
  { key: "email", label: "LV Email" },
  { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
];

function Instructors() {
  const resource = useApiResource(loadInstructors);
  return <AdminPageLayout>
    <PageHeading title="Instructors" description="Instructor directory" action={<Link to="/instructors/add" className="rounded-[5px] bg-[#203b82] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172e68]">Add instructor</Link>} />
    <ResourceState {...resource} onRetry={resource.reload}><DataTable columns={columns} rows={resource.data || []} empty="No instructors found." /></ResourceState>
  </AdminPageLayout>;
}

export default Instructors;
