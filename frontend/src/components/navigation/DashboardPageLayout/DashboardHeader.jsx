import { Bell, ChevronDown, UserCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";

function DashboardHeader({ height, name, role }) {
  return <header className={`flex ${height} items-center justify-between border-b border-slate-100 bg-white px-5 transition-colors dark:border-slate-800 dark:bg-slate-950 sm:px-8 lg:px-10`}>
    <div className="flex items-center gap-3"><SidebarTrigger className="md:hidden" /></div>
    <div className="flex items-center gap-3 text-slate-950 dark:text-slate-100">
      <ThemeToggle />
      <span title="Notifications are not available from the current API" className="rounded-full p-2 text-slate-500 dark:text-slate-400">
        <Bell className="size-5" strokeWidth={2} />
      </span>
      <div className="flex items-center gap-2">
        <UserCircle className="size-7 text-slate-400 dark:text-slate-500" strokeWidth={1.75} />
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-bold">{name}</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{role}</p>
        </div>
        <ChevronDown className="size-4" />
      </div>
    </div>
  </header>;
}

export default DashboardHeader;
