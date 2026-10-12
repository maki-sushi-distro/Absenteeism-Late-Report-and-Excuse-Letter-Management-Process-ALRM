import { AlertTriangle, BookOpen, GraduationCap, UserRoundCheck, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "@/api/dashboardData";
import MetricCard from "@/components/dashboard/MetricCard";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import { useApiResource } from "@/hooks/useApiResource";
import AdminPageLayout from "./AdminPageLayout";

function ProgramSummary({ programs }) {
  return <section className="mt-8">
    <div className="mb-3 flex items-center justify-between gap-4"><h2 className="text-lg font-bold">Programs</h2><Link to="/programs" className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">View programs</Link></div>
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="px-4 py-3">Program</th><th className="px-4 py-3">Students</th><th className="px-4 py-3">Classes</th></tr></thead>
        <tbody>{programs.map((program) => <tr key={program.id} className="border-t border-slate-200 dark:border-slate-800"><td className="px-4 py-3 font-medium">{program.program_name}</td><td className="px-4 py-3">{program.student_count ?? 0}</td><td className="px-4 py-3">{program.classes_count ?? 0}</td></tr>)}</tbody>
      </table>
      {!programs.length && <p className="px-4 py-8 text-center text-sm text-slate-500">No programs found.</p>}
    </div>
  </section>;
}

function AdminDashboard() {
  const resource = useApiResource(getAdminDashboard);
  const data = resource.data;
  return <AdminPageLayout>
    <PageHeading title="Dashboard" description="College-wide attendance and request overview" action={<Link to="/reports" className="rounded-[5px] bg-[#203b82] px-4 py-2 text-sm font-semibold text-white hover:bg-[#172e68]">Export report</Link>} />
    <ResourceState {...resource} onRetry={resource.reload}>
      {data && <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Students" value={data.total_students} icon={UsersRound} />
          <MetricCard label="Instructors" value={data.total_instructors} icon={UserRoundCheck} />
          <MetricCard label="Programs" value={data.total_programs} icon={GraduationCap} />
          <MetricCard label="Classes" value={data.total_classes} icon={BookOpen} />
          <MetricCard label="Pending requests" value={data.pending_requests} />
          <MetricCard label="Staff awaiting approval" value={data.pending_staff_approvals} />
          <MetricCard label="Warnings" value={data.warning_count} icon={AlertTriangle} />
          <MetricCard label="IR cases" value={data.ir_count} icon={AlertTriangle} />
        </div>
        <ProgramSummary programs={data.programs_summary || []} />
      </>}
    </ResourceState>
  </AdminPageLayout>;
}

export default AdminDashboard;
