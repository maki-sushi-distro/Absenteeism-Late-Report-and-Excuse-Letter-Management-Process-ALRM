import { Bell, Loader2 } from "lucide-react";

export default function RecordActions({ record, onView, description, onFollowUp, followingUpId = null }) {
  const isSending = followingUpId === record.id;
  return <div className="flex w-full min-w-0 flex-wrap items-center justify-start gap-x-4 gap-y-2">
    <button type="button" onClick={() => onView(record)} className="whitespace-nowrap font-medium text-[#0969FF] hover:underline dark:text-blue-400">
      View Record<span className="sr-only"> for {description}</span>
    </button>
    {record.status === "pending" && <button
      type="button"
      onClick={() => onFollowUp(record)}
      disabled={Boolean(followingUpId) || !onFollowUp}
      aria-busy={isSending}
      title={!onFollowUp ? "Follow-up is unavailable." : undefined}
      className="inline-flex h-8 w-24 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-blue-200 bg-blue-50 px-1 text-sm font-semibold text-blue-800 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200 dark:hover:bg-blue-900"
    >
      {isSending ? <Loader2 aria-hidden="true" className="size-3.5 shrink-0 animate-spin" /> : <Bell aria-hidden="true" className="size-3.5 shrink-0" />}
      Follow up<span className="sr-only"> on {description}</span>
    </button>}
  </div>;
}
