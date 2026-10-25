import { getInstructorRequests } from "../../api/instructor.js";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/notifications.js";
import { normalizeRole } from "../../lib/roles.js";
import { markNotificationsRead } from "../../pages/auth/student/notifications/notificationReadStore.js";

async function loadRequests() {
  const requests = await getInstructorRequests();
  if (!Array.isArray(requests)) throw new Error("The server returned an unexpected requests response.");
  return requests;
}

export async function loadNotificationFeed(role) {
  if (normalizeRole(role) !== "instructor") return { notifications: await getNotifications(), requests: [], warning: "" };
  const [notices, submissions] = await Promise.allSettled([getNotifications(), loadRequests()]);
  if (notices.status === "rejected" && submissions.status === "rejected") throw notices.reason;
  const warnings = [];
  if (notices.status === "rejected") warnings.push("Notifications could not be loaded. Showing available request activity. Try refreshing.");
  if (submissions.status === "rejected") warnings.push("Request activity could not be loaded. Showing available notifications. Try refreshing.");
  return { notifications: notices.status === "fulfilled" ? notices.value : [],
    requests: submissions.status === "fulfilled" ? submissions.value : [], warning: warnings.join(" ") };
}

export async function markFeedRead(userId, items, all = false) {
  const serverIds = [...new Set(items.filter(item => item.source !== "request").map(item => item.id))];
  if (serverIds.length) {
    if (all) await markAllNotificationsRead();
    else await Promise.all(serverIds.map(markNotificationRead));
  }
  const localIds = items.filter(item => item.source === "request").map(item => item.id);
  if (localIds.length) markNotificationsRead(`instructor:${userId}`, localIds, window.localStorage);
}
