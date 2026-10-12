import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { attendanceSummary, yearLevel } from "./profileDisplay";
import AbsenceCountCard from "./AbsenceCountCard";
import RequestFilters from "./RequestFilters";
import RequestsTable from "./RequestsTable";
import StudentIdentityCard from "./StudentIdentityCard";

function ProfileContent({ profile }) {
  const { student } = profile;
  return <>
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
      <StudentIdentityCard student={student} />
      <AbsenceCountCard attendance={attendanceSummary(student)} />
    </section>
    <div className="text-xs font-bold text-slate-600">Year/Section: {yearLevel(student)}</div>
    {profile.hasRequestData ? <>
      <RequestFilters search={profile.requestSearch} status={profile.statusFilter}
        onSearchChange={profile.setRequestSearch} onStatusChange={profile.setStatusFilter} />
      <RequestsTable requests={profile.filteredRequests} />
    </> : <Alert className="rounded-[5px]">
      <AlertCircle className="size-4" /><AlertTitle>Request history unavailable</AlertTitle>
      <AlertDescription>The student profile API does not include this student's requests.</AlertDescription>
    </Alert>}
  </>;
}

export default ProfileContent;
