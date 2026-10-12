import { AlertTriangle, BookOpen, FileText, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { getInstructorDashboard } from "@/api/dashboardData";
import MetricCard from "@/components/dashboard/MetricCard";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import { useApiResource } from "@/hooks/useApiResource";
import InstructorPageLayout from "./InstructorPageLayout";

function InstructorDashboard() {
  const resource = useApiResource(getInstructorDashboard);
  const data = resource.data;
  return <InstructorPageLayout>
    <PageHeading title="Dashboard" description="Your classes and student requests" />
    <ResourceState {...resource} onRetry={resource.reload}>
      {data && <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Classes" value={data.total_classes} icon={BookOpen} />
          <MetricCard label="Students" value={data.total_students} icon={UsersRound} />
          <MetricCard label="Pending requests" value={data.pending_requests?.length ?? 0} icon={FileText} />
          <MetricCard label="Flagged students" value={data.flagged_students?.length ?? 0} icon={AlertTriangle} />
        </div>
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Requests awaiting review</h2><Link to="/instructor/class-requests" className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">View all</Link></div>
          <div className="border border-slate-200 dark:border-slate-800">
            {(data.pending_requests || []).slice(0, 5).map((request) => <div key={request.id} className="flex justify-between gap-4 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800"><span>{request.enrollment?.student?.name || "Student"} · {request.enrollment?.class?.subject_name || "Class"}</span><span className="capitalize text-slate-500">{request.type}</span></div>)}
            {!data.pending_requests?.length && <p className="px-4 py-8 text-center text-sm text-slate-500">No requests are awaiting review.</p>}
          </div>
        </section>
      </>}
    </ResourceState>
  </InstructorPageLayout>;
}

export default InstructorDashboard;
