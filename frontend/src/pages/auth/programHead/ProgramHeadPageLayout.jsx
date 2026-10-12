import { AlertTriangle, FileText, LayoutDashboard, Settings } from "lucide-react";
import AdminPageLayout from "../admin/AdminPageLayout";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Requests", path: "/program-head/requests", icon: FileText },
  { label: "Flagged Students", path: "/program-head/flagged", icon: AlertTriangle },
  { label: "Settings", path: "/settings", icon: Settings },
];

function ProgramHeadPageLayout({ children }) {
  return <AdminPageLayout navigation={navigation}>{children}</AdminPageLayout>;
}

export default ProgramHeadPageLayout;
