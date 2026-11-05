import { Tabs } from "@base-ui/react/tabs";
import { Check, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import NotificationPanel from "./NotificationPanel";
import { groupNotificationActivity } from "@/components/notifications/notificationData";

export default function NotificationsView({ activity = [], readIds = new Set(), filter = "all", onFilterChange, loading, error, warning, reload, markRead, readError, canMarkAll, markAllRead, readStatusTitle = "Read status is saved on this browser", unreadTitle = "Unread on this browser" }) {
  const unread = activity.filter((item) => !readIds.has(item.id));
  const visible = filter === "unread" ? unread : activity;
  const groups = groupNotificationActivity(activity, filter, new Date(), readIds);
  return <section aria-labelledby="notifications-title" className="grid min-w-0 gap-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="notifications-title" className="text-2xl font-bold">Notifications</h1>
        {!loading && !error && <span title={unreadTitle} className="rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">{unread.length} unread</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={markAllRead} disabled={!canMarkAll} title={readStatusTitle} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-900"><Check aria-hidden="true" className="size-4" />Mark all as read</button>
        <Link to="/settings" className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-900"><Settings aria-hidden="true" className="size-4" />Notification settings</Link>
      </div>
    </div>
    {readError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{readError}</p>}
    <Tabs.Root value={filter} onValueChange={onFilterChange} className="grid min-w-0 gap-4">
      <Tabs.List aria-label="Filter notifications" className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
        {[{ value: "all", label: "All" }, { value: "unread", label: "Unread" }].map((tab) => <Tabs.Tab key={tab.value} value={tab.value} className="min-h-10 min-w-24 border-b-2 border-transparent px-5 py-2 text-sm font-semibold text-slate-500 focus-visible:outline-2 focus-visible:outline-blue-500 data-active:border-blue-700 data-active:text-blue-700 dark:text-slate-400 dark:data-active:border-blue-400 dark:data-active:text-blue-300">{tab.label}</Tabs.Tab>)}
      </Tabs.List>
      {["all", "unread"].map((value) => <Tabs.Panel key={value} value={value} className="min-w-0 outline-none">
        {filter === value && (loading || error || !visible.length ? <NotificationPanel activity={visible} readIds={readIds} onRead={markRead ? (id) => markRead([id]) : undefined} loading={loading} error={error} warning={warning} onRefresh={reload} showFooter={false} unreadTitle={unreadTitle} emptyMessage={filter === "unread" ? "No unread notifications." : "No request updates yet."} />
          : <div className="grid gap-6">{groups.map((group, index) => <section key={group.label} aria-labelledby={`notification-group-${group.label.toLowerCase()}`} className="grid gap-2">
            <h2 id={`notification-group-${group.label.toLowerCase()}`} className="text-sm font-bold text-slate-700 dark:text-slate-200">{group.label}</h2>
            <NotificationPanel activity={group.items} readIds={readIds} onRead={markRead ? (id) => markRead([id]) : undefined} warning={index === 0 ? warning : ""} onRefresh={reload} showHeader={false} showFooter={false} unreadTitle={unreadTitle} />
          </section>)}</div>)}
      </Tabs.Panel>)}
    </Tabs.Root>
  </section>;
}
