import { useAuth } from "@/context/AuthContext";
import { usePreviewRole } from "@/hooks/usePreviewRole";
import { normalizeRole } from "@/lib/roles";
import HttpErrorPage from "./HttpErrorPage";
import { AdminDashboard } from "./auth/admin/AdminDashboard";
import AdminPageLayout from "./auth/admin/AdminPageLayout";
import { InstructorDashboard } from "./auth/instructor/InstructorDashboard";
import InstructorPageLayout from "./auth/instructor/InstructorPageLayout";
import { ProgramHeadDashboard } from "./auth/programHead/ProgramHeadDashboard";
import ProgramHeadPageLayout from "./auth/programHead/ProgramHeadPageLayout";
import StudentDashboard from "./auth/student/StudentDashboard";

export function Dashboard() {
  const { user } = useAuth();
  const { activeRole } = usePreviewRole(user);
  const role = normalizeRole(activeRole);

  if (role === "student") return <StudentDashboard />;
  if (role === "instructor") {
    return <InstructorPageLayout><InstructorDashboard /></InstructorPageLayout>;
  }
  if (role === "program") {
    return <ProgramHeadPageLayout><ProgramHeadDashboard /></ProgramHeadPageLayout>;
  }
  if (role === "admin") {
    return <AdminPageLayout><AdminDashboard /></AdminPageLayout>;
  }

  return <HttpErrorPage status={403} />;
}
