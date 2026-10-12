import DashboardPageLayout from "@/components/navigation/DashboardPageLayout";
import { useAuth } from "@/context/AuthContext";
import { usePreviewRole } from "@/hooks/usePreviewRole";
import { previewRoleLabel } from "@/lib/previewRole";
import Sidebar from "./Sidebar";

function AdminPageLayout({ children, navigation }) {
  const { user } = useAuth();
  const { activeRole } = usePreviewRole(user);
  return <Sidebar navigation={navigation}>
    <DashboardPageLayout name={user?.name || "Admin"} role={previewRoleLabel(activeRole)}
      variant="admin">{children}</DashboardPageLayout>
  </Sidebar>;
}

export default AdminPageLayout;
