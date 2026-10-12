import { ClipboardList, FileText, LayoutDashboard, Settings } from "lucide-react";
import RoleSidebar from "@/components/navigation/RoleSidebar";

const navigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Class Records", path: "/instructor/class-records", icon: ClipboardList },
  { label: "Class Requests", path: "/instructor/class-requests", icon: FileText },
  { label: "Settings", path: "/settings", icon: Settings },
];

function InstructorSidebar({ children }) {
  return <RoleSidebar navigation={navigation} compact="instructor">{children}</RoleSidebar>;
}

export default InstructorSidebar;
