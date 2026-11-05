import { Loader2 } from "lucide-react";

function formatCountdown(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function RecordActions({ record, onView, description, onFollowUp, followingUpId = null, cooldownSeconds = 0, checkingCooldown = false }) {
  const isSending = followingUpId === record.id;
  const countdown = cooldownSeconds > 0 ? formatCountdown(cooldownSeconds) : "";
  const followUpLabel = countdown
    ? `Follow up available in ${countdown}`
    : description ? `Follow up on ${description}` : "Follow up";
  return <div className="flex min-w-0 flex-nowrap items-center justify-start gap-2">
    {onView && <button type="button" onClick={() => onView(record)} className="whitespace-nowrap text-xs font-medium text-[#0969FF] hover:underline dark:text-blue-400">
      View Record<span className="sr-only"> for {description}</span>
    </button>}
    {record.status === "pending" && onFollowUp && <button
      type="button"
      onClick={() => onFollowUp(record)}
      disabled={checkingCooldown || Boolean(followingUpId) || Boolean(countdown)}
      aria-busy={isSending}
      aria-label={followUpLabel}
      title={countdown ? followUpLabel : undefined}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[#173D83] px-4 text-sm font-semibold text-[#173D83] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-slate-800"
    >
      {isSending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
      {checkingCooldown ? "Checking follow-up…" : countdown ? `Follow up in ${countdown}` : isSending ? "Sending..." : "Follow up"}
    </button>}
  </div>;
}
