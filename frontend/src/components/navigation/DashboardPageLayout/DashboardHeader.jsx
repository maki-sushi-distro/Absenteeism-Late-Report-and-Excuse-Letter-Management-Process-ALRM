import { Bell, ChevronDown, UserCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { SidebarTrigger } from "@/components/ui/sidebar";

function DashboardHeader({ height, name, role }) {
  return <header className={`flex ${height} min-w-0 items-center justify-between border-b border-slate-100 bg-white px-5 transition-colors dark:border-slate-800 dark:bg-slate-950 sm:px-8 lg:px-10`}>
    <div className="flex shrink-0 items-center"><SidebarTrigger className="md:hidden" /></div>
    <div className="flex min-w-0 items-center gap-3 text-slate-950 dark:text-slate-100">
      <ThemeToggle />
      <span title="Notifications are not available from the current API" className="rounded-full p-2 text-slate-500 dark:text-slate-400">
        <Bell className="size-5" strokeWidth={2} />
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <UserCircle className="size-7 shrink-0 text-slate-400 dark:text-slate-500" strokeWidth={1.75} />
        <div className="hidden min-w-0 max-w-48 leading-tight sm:block">
          <p className="truncate text-sm font-bold" title={name}>{name}</p>
          <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">{role}</p>
        </div>
        <ChevronDown className="size-4" />
      </div>
    </div>
  </header>;
}

export default DashboardHeader;
