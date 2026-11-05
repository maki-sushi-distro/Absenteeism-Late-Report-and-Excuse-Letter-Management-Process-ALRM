import { useEffect, useRef, useState } from "react";
import { followUpStudentRequest } from "@/api/studentRequests";
import { toast } from "@/components/ui/toast";

const FOLLOW_UP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function followUpCooldownExpiresAt(flaggedDate, now = Date.now()) {
  const sentAt = Date.parse(flaggedDate);
  return (Number.isFinite(sentAt) ? sentAt : now) + FOLLOW_UP_COOLDOWN_MS;
}

export function activeFollowUpCooldown(record, now = Date.now()) {
  const flaggedDate = (record?.followup_flag || record?.followupFlag)?.flagged_date;
  if (!flaggedDate) return null;
  const expiry = followUpCooldownExpiresAt(flaggedDate, now);
  return expiry > now ? expiry : null;
}

export function shouldRefreshFollowUpCooldown(record, checkedRequestIds) {
  return record?.status === "pending" && Boolean(record.id) && !checkedRequestIds.has(record.id);
}

function storageKey(userId) {
  return userId ? `alrm_follow_up_cooldowns:${userId}` : null;
}

function readCooldowns(userId, now = Date.now()) {
  const key = storageKey(userId);
  if (!key) return {};
  try {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return Object.fromEntries(Object.entries(stored).filter(([, expiry]) => Number.isFinite(expiry) && expiry > now));
  } catch {
    return {};
  }
}

function writeCooldowns(userId, cooldowns) {
  const key = storageKey(userId);
  if (!key) return;
  try { localStorage.setItem(key, JSON.stringify(cooldowns)); } catch { /* Browser storage is optional. */ }
}

export default function useRequestFollowUp(userId) {
  const [followingUpId, setFollowingUpId] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(() => readCooldowns(userId));
  const [now, setNow] = useState(() => Date.now());
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  const hasActiveCooldown = Object.values(cooldownUntil).some((expiry) => expiry > now);
  useEffect(() => {
    if (!hasActiveCooldown) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasActiveCooldown]);

  const cooldownSecondsById = Object.fromEntries(
    Object.entries(cooldownUntil).map(([requestId, expiry]) => [requestId, Math.max(0, Math.ceil((expiry - now) / 1000))]),
  );

  function syncCooldown(record) {
    const expiry = activeFollowUpCooldown(record);
    if (!record?.id || !expiry) return;
    setCooldownUntil((current) => {
      const nextCooldowns = { ...current, [record.id]: expiry };
      writeCooldowns(userId, nextCooldowns);
      return nextCooldowns;
    });
    setNow(Date.now());
  }

  async function followUp(record) {
    if (record?.status !== "pending" || !record.id || requestRef.current || cooldownSecondsById[record.id] > 0) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setFollowingUpId(record.id);
    try {
      const body = await followUpStudentRequest(record.id, { signal: controller.signal });
      if (!controller.signal.aborted) {
        const nextCooldowns = {
          ...cooldownUntil,
          [record.id]: followUpCooldownExpiresAt(body.data?.flagged_date),
        };
        setCooldownUntil(nextCooldowns);
        setNow(Date.now());
        writeCooldowns(userId, nextCooldowns);
        toast.add({
          type: "success",
          title: "Follow-up recorded",
          description: typeof body.message === "string" ? body.message : "Your instructor has been notified in the system.",
        });
      }
    } catch (issue) {
      if (!controller.signal.aborted) toast.add({ type: "error", title: "Follow-up failed", description: issue.message || "Unable to send your follow-up." });
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setFollowingUpId(null);
    }
  }

  return { followingUpId, cooldownSecondsById, followUp, syncCooldown };
}
