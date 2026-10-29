import { getInstructorRequests } from "../../api/instructor.js";
import { getAdminAuditLogs } from "../../api/admin.js";
import { getProgramHeadAuditLogs } from "../../api/programHead.js";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../../api/notifications.js";
import { normalizeRole } from "../../lib/roles.js";
import { initializeNotificationReadIds, markNotificationsRead } from "../../pages/auth/student/notifications/notificationReadStore.js";

async function loadRequests() {
  const requests = await getInstructorRequests();
  if (!Array.isArray(requests)) throw new Error("The server returned an unexpected requests response.");
  return requests;
}

export async function loadNotificationFeed(role, userId) {
  const normalized = normalizeRole(role);
  if (["admin", "program"].includes(normalized)) {
    const loadLogs = normalized === "admin" ? getAdminAuditLogs : getProgramHeadAuditLogs;
    const readKey = `${normalized === "admin" ? "admin" : "program"}-activity:${userId}`;
    const [notices, logs] = await Promise.allSettled([getNotifications(), loadLogs()]);
    if (notices.status === "rejected" && logs.status === "rejected") throw notices.reason;
    const warnings = [];
    if (notices.status === "rejected") warnings.push("Notifications could not be loaded. Showing available activity log entries. Try refreshing.");
    if (logs.status === "rejected") warnings.push("Activity log notifications could not be loaded. Showing available notifications. Try refreshing.");
    const auditLogs = logs.status === "fulfilled" ? logs.value : [];
    let auditReadIds = new Set();
    if (logs.status === "fulfilled") {
      try { auditReadIds = initializeNotificationReadIds(readKey, auditLogs.map(log => `audit-log:${log.id}`), window.localStorage); }
      catch { auditReadIds = new Set(auditLogs.map(log => `audit-log:${log.id}`)); }
    }
    return { notifications: notices.status === "fulfilled" ? notices.value : [], requests: [], auditLogs, auditReadIds, warning: warnings.join(" ") };
  }
  if (normalized !== "instructor") return { notifications: await getNotifications(), requests: [], auditLogs: [], warning: "" };
  const [notices, submissions] = await Promise.allSettled([getNotifications(), loadRequests()]);
  if (notices.status === "rejected" && submissions.status === "rejected") throw notices.reason;
  const warnings = [];
  if (notices.status === "rejected") warnings.push("Notifications could not be loaded. Showing available request activity. Try refreshing.");
  if (submissions.status === "rejected") warnings.push("Request activity could not be loaded. Showing available notifications. Try refreshing.");
  return { notifications: notices.status === "fulfilled" ? notices.value : [],
    requests: submissions.status === "fulfilled" ? submissions.value : [], warning: warnings.join(" ") };
}

export async function markFeedRead(userId, items, all = false) {
  const serverIds = [...new Set(items.filter(item => !item.source).map(item => item.id))];
  if (serverIds.length) {
    if (all) await markAllNotificationsRead();
    else await Promise.all(serverIds.map(markNotificationRead));
  }
  const localItems = items.filter(item => item.source);
  for (const readKey of new Set(localItems.map(item => item.readKey || `instructor:${userId}`))) {
    markNotificationsRead(readKey, localItems.filter(item => (item.readKey || `instructor:${userId}`) === readKey).map(item => item.id), window.localStorage);
  }
}
