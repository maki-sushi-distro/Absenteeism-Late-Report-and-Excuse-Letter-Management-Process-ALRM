import { ClipboardList, FileText, LayoutDashboard, Settings } from "lucide-react";
import RoleSidebar from "@/components/navigation/RoleSidebar";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "My Records", path: "/student/records", icon: ClipboardList },
  { label: "My Request", path: "/student/request", icon: FileText },
  { label: "Settings", path: "/settings", icon: Settings },
];

function StudentSidebar({ children }) {
  return <RoleSidebar navigation={navigation}>{children}</RoleSidebar>;
}

export default StudentSidebar;
