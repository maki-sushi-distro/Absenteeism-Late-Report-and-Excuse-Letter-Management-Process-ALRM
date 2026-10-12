import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AdminPageLayout from "../AdminPageLayout";
import ActiveFilters from "./ActiveFilters";
import StudentFilters from "./StudentFilters";
import StudentsTable from "./StudentsTable";
import { useStudents } from "./useStudents";

function Students() {
  const navigate = useNavigate();
  const state = useStudents();

  return <AdminPageLayout>
    <div className="mx-auto grid w-full max-w-[980px] gap-6">
      <section>
        <h1 className="text-2xl font-black uppercase tracking-normal text-slate-950">Students</h1>
        <p className="mt-2 text-sm font-medium text-slate-700">Manage and view all students in the system</p>
      </section>
      <StudentFilters filters={state.filters} loadingPrograms={state.loadingPrograms}
        onChange={state.changeFilter} programs={state.programs} />
      {state.error && <Alert variant="destructive" className="rounded-[5px]">
        <AlertCircle className="size-4" /><AlertTitle>Unable to load student data</AlertTitle>
        <AlertDescription>{state.error}{state.error.includes("404") &&
          " Confirm that GET /api/admin/users?role=student is available on the backend."}</AlertDescription>
      </Alert>}
      <ActiveFilters filters={state.filters} programName={state.activeProgramName} onClear={state.clearFilters} />
      <StudentsTable loading={state.loadingStudents} students={state.students} programs={state.programs}
        onOpenStudent={(studentId) => navigate(`/students/${studentId}`)} />
    </div>
  </AdminPageLayout>;
}

export default Students;
