import { Bell } from "lucide-react";

const followUpNotice = "Follow-up reminders are not available yet. The backend does not provide a student follow-up endpoint.";

export default function RecordActions({ record, onView, description }) {
  const noticeId = `follow-up-notice-${record.id}`;
  return <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-x-4 gap-y-2">
    <button type="button" onClick={() => onView(record)} className="whitespace-nowrap font-medium text-[#0969FF] hover:underline dark:text-blue-400">
      View Record<span className="sr-only"> for {description}</span>
    </button>
    {record.status === "pending" && <span title={followUpNotice}>
      <button type="button" disabled aria-describedby={noticeId} className="inline-flex h-8 w-24 cursor-not-allowed items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-1 text-sm font-semibold text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
        <Bell aria-hidden="true" className="size-3.5 shrink-0" />Follow up
      </button>
      <span id={noticeId} className="sr-only">{followUpNotice}</span>
    </span>}
  </div>;
}
