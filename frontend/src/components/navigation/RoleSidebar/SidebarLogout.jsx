import { LogOut } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogMedia, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SidebarMenuButton } from "@/components/ui/sidebar";

function SidebarLogout({ onLogout, wide }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<SidebarMenuButton type="button" tooltip="Logout" className={`gap-3 rounded-[6px] text-slate-100 hover:bg-red-500/15 hover:text-white group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! ${wide ? "h-11 gap-4 px-5 text-[18px] font-semibold group-data-[collapsible=icon]:size-11!" : "h-9 px-4 text-[15px] font-bold group-data-[collapsible=icon]:size-10!"}`} />}>
        <LogOut className={`shrink-0 ${wide ? "size-[30px]" : "size-5"}`} strokeWidth={2.25} />
        <span className="group-data-[collapsible=icon]:hidden">Logout</span>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-[8px]">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300"><LogOut className="size-5" strokeWidth={2.25} /></AlertDialogMedia>
          <AlertDialogTitle className="font-black text-slate-950 dark:text-slate-50">Logout of ALRM?</AlertDialogTitle>
          <AlertDialogDescription>You will need to sign in again with your LV email account before accessing your dashboard.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-9 rounded-[5px] border-slate-300 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onLogout} className="h-9 rounded-[5px] bg-red-600 font-bold text-white hover:bg-red-700">Logout</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default SidebarLogout;
