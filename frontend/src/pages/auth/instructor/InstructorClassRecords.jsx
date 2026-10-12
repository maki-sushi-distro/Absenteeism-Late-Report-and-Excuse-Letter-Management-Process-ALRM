import { getInstructorDashboard } from "@/api/dashboardData";
import DataTable from "@/components/dashboard/DataTable";
import MetricCard from "@/components/dashboard/MetricCard";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useApiResource } from "@/hooks/useApiResource";
import InstructorPageLayout from "./InstructorPageLayout";

const columns = [
  { key: "student", label: "Student", render: (row) => row.student?.name || "—" },
  { key: "class", label: "Class" },
  { key: "absences", label: "Converted absences" },
  { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
];

function InstructorClassRecords() {
  const resource = useApiResource(getInstructorDashboard);
  return <InstructorPageLayout>
    <PageHeading title="Class Records" description="Attendance cases in your assigned classes" />
    <ResourceState {...resource} onRetry={resource.reload}>
      <div className="grid gap-7">
        <div className="grid gap-4 md:grid-cols-2"><MetricCard label="Assigned classes" value={resource.data?.total_classes} /><MetricCard label="Students" value={resource.data?.total_students} /></div>
        <section><h2 className="mb-3 text-lg font-bold">Students at risk</h2><DataTable columns={columns} rows={resource.data?.flagged_students || []} rowKey={(row) => `${row.student?.id}:${row.class}`} empty="No students are currently flagged." /></section>
      </div>
    </ResourceState>
  </InstructorPageLayout>;
}

export default InstructorClassRecords;
