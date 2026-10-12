import { AlertTriangle, BookOpen, FileText, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { getProgramHeadDashboard } from "@/api/dashboardData";
import MetricCard from "@/components/dashboard/MetricCard";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import { useApiResource } from "@/hooks/useApiResource";
import ProgramHeadPageLayout from "./ProgramHeadPageLayout";

function ProgramHeadDashboard() {
  const resource = useApiResource(getProgramHeadDashboard);
  const data = resource.data;
  return <ProgramHeadPageLayout>
    <PageHeading title="Dashboard" description={data?.program_name || "Program overview"} />
    <ResourceState {...resource} onRetry={resource.reload}>
      {data && <>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Students" value={data.total_students} icon={UsersRound} />
          <MetricCard label="Classes" value={data.total_classes} icon={BookOpen} />
          <MetricCard label="Pending requests" value={data.pending_requests} icon={FileText} />
          <MetricCard label="Warning / IR" value={`${data.warning_count ?? 0} / ${data.ir_count ?? 0}`} icon={AlertTriangle} />
        </div>
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Recent flags</h2><Link to="/program-head/flagged" className="text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300">View all</Link></div>
          <div className="border border-slate-200 dark:border-slate-800">
            {(data.recent_flags || []).map((flag) => <div key={flag.id} className="flex justify-between gap-4 border-b border-slate-200 px-4 py-3 text-sm last:border-b-0 dark:border-slate-800"><span>{flag.request?.enrollment?.student?.name || "Student"}</span><span className="font-semibold text-amber-700 dark:text-amber-300">{flag.status}</span></div>)}
            {!data.recent_flags?.length && <p className="px-4 py-8 text-center text-sm text-slate-500">No recent flags.</p>}
          </div>
        </section>
      </>}
    </ResourceState>
  </ProgramHeadPageLayout>;
}

export default ProgramHeadDashboard;
