import {
  Home,
  Users,
  UserCheck,
  LayoutGrid,
  UserCog,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Dashboard", url: "/", icon: Home, isActive: true },
  { title: "Students", url: "/students", icon: Users },
  { title: "Instructors", url: "/instructors", icon: UserCheck },
  { title: "Programs", url: "/programs", icon: LayoutGrid },
  { title: "User Management", url: "/users", icon: UserCog },
  { title: "Settings", url: "/settings", icon: Settings },
];

function AppSideBar() {
  return (
    <Sidebar
      // 1. ADD THIS: Tells the sidebar to shrink to icons instead of disappearing
      collapsible="icon"
      className="border-r-0 [&>div[data-sidebar=sidebar]]:bg-[#0B1428]"
    >
      {/* HEADER SECTION */}
      {/* Adjusted padding when collapsed to keep the logo centered */}
      <SidebarHeader className="p-6 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:mt-4">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          {/* Preset Logo Placeholder - Always visible */}
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white ring-1 ring-white/20">
            AL
          </div>
          {/* 2. ADD THIS: Hides the text ONLY when the sidebar is collapsed */}
          <span className="text-base font-bold tracking-wider text-white truncate group-data-[collapsible=icon]:hidden">
            ALRM SYSTEM
          </span>
        </div>
      </SidebarHeader>

      {/* NAVIGATION SECTION */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {/* Adjusted padding for collapsed state */}
            <SidebarMenu className="gap-2 px-4  group-data-[collapsible=icon]:px-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={item.isActive}
                    tooltip={item.title}
                    className={`h-11 px-4 text-sm transition-colors group-data-[collapsible=icon]:!w-10 group-data-[collapsible=icon]:!h-10 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!mx-auto group-data-[collapsible=icon]:justify-center ${
                      item.isActive
                        ? "bg-[#1C2C54] text-white hover:bg-[#1C2C54] hover:text-white font-medium rounded-md group-data-[collapsible=icon]:!bg-white group-data-[collapsible=icon]:!text-black"
                        : "text-slate-300 hover:bg-white/5 hover:text-white rounded-md"
                    }`}
                    render={<a href={item.url} />}
                  >
                    <item.icon className="size-5 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">
                      {item.title}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSideBar;
