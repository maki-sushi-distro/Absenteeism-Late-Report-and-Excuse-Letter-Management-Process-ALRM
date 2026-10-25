import { NavLink, useNavigate } from "react-router-dom";
import {
  FilePen,
  FileInput,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import LogoutConfirmation from "@/components/navigation/RoleSidebar/LogoutConfirmation";
import { logoutToSignedOut } from "@/lib/logout";
import {
  Sidebar as AppSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import lvLogo from "@/assets/LV_Logo.png";

const menuItems = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Class Records",
    path: "/instructor/class-records",
    icon: FilePen,
  },
  {
    label: "Class Requests",
    path: "/instructor/class-requests",
    icon: FileInput,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

function InstructorSidebarBrand() {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      onClick={toggleSidebar}
      className="flex h-[70px] w-full items-center gap-2 px-5 text-white hover:bg-white/5 hover:text-white group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
    >
      <img
        src={lvLogo}
        alt="ALRM System logo"
        className="size-9 shrink-0 object-contain"
      />
      <span className="whitespace-nowrap text-xl font-black tracking-normal group-data-[collapsible=icon]:hidden">
        ALRM SYSTEM
      </span>
    </button>
  );
}

function InstructorSidebar({ children }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    return logoutToSignedOut(logout, navigate);
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "214px",
        "--sidebar-width-icon": "72px",
      }}
    >
      <AppSidebar
        collapsible="icon"
        className="border-0 bg-[#0d1526] text-white"
      >
        <SidebarHeader className="bg-[#0d1526] p-0">
          <InstructorSidebarBrand />
        </SidebarHeader>

        <SidebarContent className="bg-[#0d1526] px-3 py-7 group-data-[collapsible=icon]:px-3">
          <SidebarMenu className="gap-3">
            {menuItems.map((item) => {
              const Icon = item.icon;

              return (
                <SidebarMenuItem key={item.path}>
                  <NavLink to={item.path} aria-label={item.label} end={item.path === "/dashboard"}>
                    {({ isActive }) => (
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          "h-9 gap-3 rounded-[6px] px-4 text-[15px] font-bold text-slate-100 hover:bg-white/10 hover:text-white [&_svg]:size-5 [--sidebar-icon-bg:#0d1526] hover:[--sidebar-icon-bg:#252c3c] group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!",
                          isActive &&
                            "bg-[#203b82] text-white hover:bg-[#203b82] data-active:bg-[#203b82] data-active:text-white data-active:hover:bg-[#203b82] [--sidebar-icon-bg:#203b82] hover:[--sidebar-icon-bg:#203b82]",
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          className={cn("size-5 shrink-0", Icon === Settings && "[&>circle]:fill-[var(--sidebar-icon-bg)] [&>circle]:stroke-none")}
                          fill={Icon === Settings ? "currentColor" : "none"}
                          strokeWidth={2}
                        />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.label}
                        </span>
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="bg-[#0d1526] px-3 pb-5 pt-3 group-data-[collapsible=icon]:px-3">
          <SidebarMenu>
            <SidebarMenuItem>
              <AlertDialog>
                <AlertDialogTrigger
                  aria-label="Logout"
                  render={
                    <SidebarMenuButton
                      type="button"
                      tooltip="Logout"
                      className="h-9 gap-3 rounded-[6px] px-4 text-[15px] font-bold text-slate-100 hover:bg-red-500/15 hover:text-white [&_svg]:size-5 group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0!"
                    />
                  }
                >
                  <LogOut aria-hidden="true" className="size-5 shrink-0" strokeWidth={2} />
                  <span className="group-data-[collapsible=icon]:hidden">
                    Logout
                  </span>
                </AlertDialogTrigger>

                <LogoutConfirmation onLogout={handleLogout} />
              </AlertDialog>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </AppSidebar>

      {children}
    </SidebarProvider>
  );
}

export default InstructorSidebar;
