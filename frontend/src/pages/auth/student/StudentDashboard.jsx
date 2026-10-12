import { BookOpen, CalendarDays, ClipboardList, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { getStudentAttendance, getStudentRequestHistory } from "@/api/dashboardData";
import MetricCard from "@/components/dashboard/MetricCard";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import { useApiResource } from "@/hooks/useApiResource";
import StudentPageLayout from "./StudentPageLayout";

function loadOverview() {
  return Promise.all([getStudentAttendance(), getStudentRequestHistory()]).then(([attendance, requests]) => ({ attendance, requests }));
}

function StudentDashboard() {
  const resource = useApiResource(loadOverview);
  const attendance = resource.data?.attendance || [];
  const requests = resource.data?.requests || [];
  const pending = requests.filter((request) => request.status === "pending").length;
  const absences = attendance.reduce((sum, item) => sum + Number(item.tracker?.total_absences || 0), 0);
  return <StudentPageLayout>
    <PageHeading title="Dashboard" description="Your attendance and request overview" action={<Link to="/student/request" className="rounded-[5px] bg-[#203b82] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172e68]">New request</Link>} />
    <ResourceState {...resource} onRetry={resource.reload}>
      <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Classes" value={attendance.length} icon={BookOpen} />
          <MetricCard label="Requests" value={requests.length} icon={FileText} />
          <MetricCard label="Pending" value={pending} icon={CalendarDays} />
          <MetricCard label="Recorded absences" value={absences} icon={ClipboardList} />
        </div>
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Recent requests</h2><Link to="/student/records" className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">View records</Link></div>
          <div className="border border-slate-200 dark:border-slate-800">
            {requests.slice(0, 5).map((request) => <div key={request.id} className="flex justify-between gap-4 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800"><span>{request.enrollment?.class?.subject_name || request.subjects_missed || "Request"}</span><span className="capitalize">{request.status}</span></div>)}
            {!requests.length && <p className="px-4 py-8 text-center text-sm text-slate-500">No requests submitted yet.</p>}
          </div>
        </section>
      </>
    </ResourceState>
  </StudentPageLayout>;
}

export default StudentDashboard;
