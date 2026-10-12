import { getAdminClasses } from "@/api/dashboardData";
import DataTable from "@/components/dashboard/DataTable";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import { useApiResource } from "@/hooks/useApiResource";
import AdminPageLayout from "./AdminPageLayout";

const columns = [
  { key: "subject_name", label: "Subject" },
  { key: "program", label: "Program", render: (row) => row.program?.program_name || "—" },
  { key: "instructor", label: "Instructor", render: (row) => row.instructor?.name || "Unassigned" },
  { key: "section", label: "Section" },
  { key: "semester", label: "Semester" },
  { key: "school_year", label: "School year" },
  { key: "enrollments_count", label: "Students" },
];

function Classes() {
  const resource = useApiResource(getAdminClasses);
  return <AdminPageLayout>
    <PageHeading title="Classes" description="Classes registered across all programs" />
    <ResourceState {...resource} onRetry={resource.reload}>
      <DataTable columns={columns} rows={resource.data || []} empty="No classes found." />
    </ResourceState>
  </AdminPageLayout>;
}

export default Classes;
