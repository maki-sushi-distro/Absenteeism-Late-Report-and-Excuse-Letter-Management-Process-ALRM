import { BookOpen, FileBarChart, GraduationCap, LayoutDashboard, Settings, UserCog, Users, UsersRound } from "lucide-react";
import RoleSidebar from "@/components/navigation/RoleSidebar";

const navigation = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Students", path: "/students", icon: UsersRound },
  { label: "Instructors", path: "/instructors", icon: Users },
  { label: "Programs", path: "/programs", icon: GraduationCap },
  { label: "User Management", path: "/user-management", icon: UserCog },
  { label: "Classes", path: "/classes", icon: BookOpen },
  { label: "Reports", path: "/reports", icon: FileBarChart },
  { label: "Settings", path: "/settings", icon: Settings },
];

function Sidebar({ children, navigation: items = navigation }) {
  return <RoleSidebar navigation={items} wide>{children}</RoleSidebar>;
}

export default Sidebar;
