import { useState } from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import useServerNotifications from "@/components/notifications/useServerNotifications";
import NotificationPanel from "./NotificationPanel";
import NotificationHeader from "./NotificationHeader";

function RequestNotifications({ user, onClose }) {
  const { activity, loading, error, reload, readIds, markRead, readError, canMarkAll, markAllRead } = useServerNotifications(user, { preview: true, enabled: true });
  return <>
    <NotificationHeader onClose={onClose} canMarkAll={canMarkAll} onMarkAll={markAllRead} />
    {readError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{readError}</p>}
    <NotificationPanel activity={activity.slice(0, 5)} loading={loading} error={error} onRefresh={reload} onClose={onClose} readIds={readIds} onRead={(id) => markRead([id])} />
  </>;
}

export default function StudentNotifications({ user }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger disabled={!user?.id} aria-label="Notifications" title="Notifications" className="rounded-full p-2 text-slate-900 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-slate-100 dark:hover:bg-slate-800">
      <Bell aria-hidden="true" className="size-5" strokeWidth={2} />
    </PopoverTrigger>
    <PopoverContent align="end" sideOffset={12} className="max-h-[calc(100dvh-6rem)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto border border-slate-200 bg-white p-4 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      {open && user?.id && <RequestNotifications user={user} onClose={close} />}
    </PopoverContent>
  </Popover>;
}
