import { ErrorState } from "@/components/common/ErrorState";
import { Spinner } from "@/components/ui/spinner";
import ProgramHeadOverview from "./ProgramHeadOverview";
import { FlaggedRecords, RequestRecords } from "./ProgramHeadRecords";
import { useProgramHeadRecords } from "./useProgramHeadRecords";

export function ProgramHeadDashboard({ view = "dashboard" }) {
  const { dashboard, flags, requests, errors, loading, refresh } = useProgramHeadRecords();
  if (loading) return <div className="flex min-h-80 items-center justify-center gap-3 text-sm"><Spinner />Loading program records</div>;

  const needed = view === "flagged" ? ["flags"] : view === "requests" ? ["requests"] : ["dashboard", "flags", "requests"];
  return <div className="space-y-5">
    {needed.filter((key) => errors[key]).map((key) => <ErrorState key={key} title={`Could not load ${key}`} message={errors[key]} />)}
    {Object.keys(errors).length ? <button type="button" onClick={refresh} className="text-sm font-medium text-blue-800 underline dark:text-blue-300">Retry loading</button> : null}
    {view === "dashboard" ? <ProgramHeadOverview dashboard={dashboard} flags={flags} requests={requests} /> : null}
    {view === "flagged" ? <FlaggedRecords flags={flags} /> : null}
    {view === "requests" ? <RequestRecords requests={requests} /> : null}
  </div>;
}
