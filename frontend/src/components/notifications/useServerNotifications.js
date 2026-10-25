import { useCallback, useEffect, useRef, useState } from "react";
import { useApiResource } from "@/hooks/useApiResource";
import useNotificationPreferences from "@/hooks/useNotificationPreferences";
import useNotificationReadState from "@/pages/auth/student/notifications/useNotificationReadState";
import { mergeRequestActivity, notificationActivity } from "./notificationData";
import { loadNotificationFeed, markFeedRead } from "./notificationFeed";

const changedEvent = "alrm:notifications-updated";

export default function useServerNotifications(user) {
  const { id, role } = user;
  const load = useCallback(() => loadNotificationFeed(role), [role]);
  const resource = useApiResource(load, id);
  const { preferences } = useNotificationPreferences(user.id, user.role);
  const { readIds: localReadIds } = useNotificationReadState(`instructor:${id}`);
  const [readError, setReadError] = useState("");
  const [working, setWorking] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    window.addEventListener(changedEvent, resource.reload);
    return () => window.removeEventListener(changedEvent, resource.reload);
  }, [resource.reload]);

  async function saveRead(items, all = false) {
    if (busy.current || !items.length) return;
    busy.current = true;
    setWorking(true);
    setReadError("");
    try {
      await markFeedRead(id, items, all);
    } catch (error) {
      if (mounted.current) setReadError(error.message || "Read status could not be saved.");
    } finally {
      window.dispatchEvent(new Event("alrm:notification-read"));
      window.dispatchEvent(new Event(changedEvent));
      busy.current = false;
      if (mounted.current) setWorking(false);
    }
  }

  const serverActivity = notificationActivity(resource.data?.notifications || [], role, preferences, id);
  const activity = mergeRequestActivity(serverActivity, preferences.requestUpdates ? resource.data?.requests || [] : [], user, localReadIds);
  const readIds = new Set(activity.filter(item => item.isRead).map(item => item.id));
  const readStatusTitle = activity.some(item => item.source === "request") ? "Notification reads are saved to your account; request activity reads are saved on this browser." : "Saved to your account";
  return { activity, readIds, loading: resource.loading, error: resource.error, warning: resource.data?.warning, reload: resource.reload, readError, working, readStatusTitle,
    canMarkAll: !working && !resource.loading && !resource.error && activity.some(item => !item.isRead),
    markRead: ids => saveRead(activity.filter(item => ids.includes(item.id) && !item.isRead)),
    markAllRead: () => saveRead(activity.filter(item => !item.isRead), true),
  };
}
