import { useAuth } from "@/context/AuthContext";
import { usePreviewRole } from "@/hooks/usePreviewRole";
import AdminDashboard from "./auth/admin/AdminDashboard";
import InstructorDashboard from "./auth/instructor/InstructorDashboard";
import ProgramHeadDashboard from "./auth/programHead/ProgramHeadDashboard";
import StudentDashboard from "./auth/student/StudentDashboard";
import HttpErrorPage from "./HttpErrorPage";

export function Dashboard() {
  const { user } = useAuth();
  const { activeRole } = usePreviewRole(user);

  if (activeRole === "student") return <StudentDashboard />;
  if (activeRole === "instructor") return <InstructorDashboard />;
  if (activeRole === "program") return <ProgramHeadDashboard />;
  if (activeRole === "admin") return <AdminDashboard />;
  return <HttpErrorPage status={403} />;
}
