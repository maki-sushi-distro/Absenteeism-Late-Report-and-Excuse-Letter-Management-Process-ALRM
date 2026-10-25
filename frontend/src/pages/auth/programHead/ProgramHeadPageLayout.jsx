import { FileBarChart, LayoutDashboard, Settings, UsersRound } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import DashboardPageLayout from "@/components/navigation/DashboardPageLayout";
import RoleSidebar from "@/components/navigation/RoleSidebar";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Instructors", path: "/program-head/instructors", icon: UsersRound },
  { label: "Report", path: "/program-head/reports", icon: FileBarChart },
  { label: "Settings", path: "/settings", icon: Settings },
];

function ProgramHeadPageLayout({ children }) {
  const { user } = useAuth();

  return (
    <RoleSidebar navigation={navigation} compact="program">
      <DashboardPageLayout name={user?.name || "Program Head"} role="Program Head" user={user}>
        {children}
      </DashboardPageLayout>
    </RoleSidebar>
  );
}

export default ProgramHeadPageLayout;
