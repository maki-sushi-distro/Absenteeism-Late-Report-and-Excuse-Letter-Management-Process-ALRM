import { useMemo } from "react";
import { getStudentAttendance, getStudentRequestHistory } from "@/api/dashboardData";
import DataTable from "@/components/dashboard/DataTable";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { useApiResource } from "@/hooks/useApiResource";
import StudentPageLayout from "./StudentPageLayout";

function loadRecords() {
  return Promise.all([getStudentAttendance(), getStudentRequestHistory()]).then(([attendance, requests]) => ({ attendance, requests }));
}

function StudentRecords() {
  const resource = useApiResource(loadRecords);
  const attendanceColumns = useMemo(() => [
    { key: "subject_name", label: "Class" },
    { key: "lates", label: "Lates", render: (row) => row.tracker?.total_lates ?? 0 },
    { key: "absences", label: "Absences", render: (row) => row.tracker?.total_absences ?? 0 },
    { key: "status", label: "Status", render: (row) => <StatusBadge value={row.tracker?.status || "safe"} /> },
  ], []);
  const requestColumns = useMemo(() => [
    { key: "class", label: "Class", render: (row) => row.enrollment?.class?.subject_name || row.subjects_missed },
    { key: "type", label: "Type", render: (row) => <span className="capitalize">{row.type}</span> },
    { key: "date_submitted", label: "Submitted", render: (row) => row.date_submitted ? new Date(row.date_submitted).toLocaleDateString() : "—" },
    { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
  ], []);
  return <StudentPageLayout>
    <PageHeading title="My Records" description="Attendance and request history" />
    <ResourceState {...resource} onRetry={resource.reload}>
      <div className="grid gap-8">
        <section><h2 className="mb-3 text-lg font-bold">Attendance by class</h2><DataTable columns={attendanceColumns} rows={resource.data?.attendance || []} rowKey={(row) => row.class_id} empty="No attendance records yet." /></section>
        <section><h2 className="mb-3 text-lg font-bold">Request history</h2><DataTable columns={requestColumns} rows={resource.data?.requests || []} empty="No requests submitted yet." /></section>
      </div>
    </ResourceState>
  </StudentPageLayout>;
}

export default StudentRecords;
