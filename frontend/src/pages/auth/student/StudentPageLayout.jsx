import DashboardPageLayout from "@/components/navigation/DashboardPageLayout";
import { useAuth } from "@/context/AuthContext";
import StudentSidebar from "./StudentSidebar";

function StudentPageLayout({ children }) {
  const { user } = useAuth();
  return <StudentSidebar>
    <DashboardPageLayout name={user?.name || "Student"} role="Student">
      {children}
    </DashboardPageLayout>
  </StudentSidebar>;
}

export default StudentPageLayout;
