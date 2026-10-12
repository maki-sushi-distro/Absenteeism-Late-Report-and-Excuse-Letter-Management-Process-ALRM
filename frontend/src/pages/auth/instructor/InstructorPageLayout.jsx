import DashboardPageLayout from "@/components/navigation/DashboardPageLayout";
import { useAuth } from "@/context/AuthContext";
import InstructorSidebar from "./InstructorSidebar";

function InstructorPageLayout({ children }) {
  const { user } = useAuth();
  return <InstructorSidebar>
    <DashboardPageLayout name={user?.name || "Instructor"} role="Instructor">
      {children}
    </DashboardPageLayout>
  </InstructorSidebar>;
}

export default InstructorPageLayout;
