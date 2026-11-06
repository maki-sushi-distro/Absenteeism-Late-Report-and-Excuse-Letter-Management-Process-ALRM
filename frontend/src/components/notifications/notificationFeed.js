import { getInstructorRequests } from "../../api/instructor.js";
import { getAdminAuditLogs } from "../../api/admin.js";
import { getProgramHeadAuditLogs } from "../../api/programHead.js";
import { getNotificationPreview, getNotifications, getNotificationUnreadCount, markAllNotificationsRead, markNotificationRead } from "../../api/notifications.js";
import { normalizeRole } from "../../lib/roles.js";
import { initializeNotificationReadIds, markNotificationsRead } from "../../pages/auth/student/notifications/notificationReadStore.js";
import { updateResourceCache } from "../../api/resourceCache.js";

const previewCache = new Map();

function cacheKey(userId) {
  return String(userId ?? "");
}

function cachePreview(userId, value) {
  previewCache.set(cacheKey(userId), value);
  return value;
}

export function getCachedNotificationPreview(userId) {
  return previewCache.get(cacheKey(userId)) || null;
}

export function cacheNotificationReadError(userId, role, message) {
  const current = getCachedNotificationPreview(userId) || { notifications: [], requests: [], auditLogs: [], unreadCount: 0 };
  cachePreview(userId, { ...current, readError: message });
  for (const key of [`notifications:preview:${userId}`, `notifications:feed:${normalizeRole(role)}:${userId}`]) {
    updateResourceCache(key, value => ({ ...value, readError: message }));
  }
}

function cachedPreviewWithReadIds(userId, ids, all = false) {
  const cached = getCachedNotificationPreview(userId);
  if (!cached) return null;
  const readIds = new Set(ids);
  let newlyRead = 0;
  const notifications = cached.notifications.map(item => {
    if (item.is_read === true || (!all && !readIds.has(item.id))) return item;
    newlyRead += 1;
    return { ...item, is_read: true };
  });
  return cachePreview(userId, { ...cached, notifications, unreadCount: all ? 0 : Math.max(0, cached.unreadCount - newlyRead), readError: "" });
}

function withReadIds(value, ids, all) {
  if (!value?.notifications) return { value, newlyRead: 0 };
  const readIds = new Set(ids);
  let newlyRead = 0;
  const notifications = value.notifications.map(item => {
    if (item.is_read === true || (!all && !readIds.has(item.id))) return item;
    newlyRead += 1;
    return { ...item, is_read: true };
  });
  return { value: { ...value, notifications, unreadCount: all ? 0 : Math.max(0, (value.unreadCount ?? 0) - newlyRead), readError: "" }, newlyRead };
}

function syncConfirmedReads(userId, role, ids, all) {
  const previewKey = `notifications:preview:${userId}`;
  const feedKey = `notifications:feed:${normalizeRole(role)}:${userId}`;
  let newlyRead = 0;
  const cached = getCachedNotificationPreview(userId);
  if (cached) {
    const updated = withReadIds(cached, ids, all);
    newlyRead = updated.newlyRead;
    cachePreview(userId, updated.value);
  }
  for (const key of [previewKey, feedKey]) {
    updateResourceCache(key, value => {
      const updated = withReadIds(value, ids, all);
      newlyRead = Math.max(newlyRead, updated.newlyRead);
      return updated.value;
    });
  }
  updateResourceCache(`notifications:unread:${userId}`, count => all ? 0 : Math.max(0, Number(count || 0) - newlyRead));
}

function fallbackUnreadCount(notifications) {
  return notifications.filter(item => item?.is_read !== true).length;
}

function countWarning() {
  return "Notification unread count could not be loaded. Showing the count available from loaded notifications.";
}

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
    const [notices, count, logs] = await Promise.allSettled([getNotifications(), getNotificationUnreadCount(), loadLogs()]);
    if (notices.status === "rejected" && logs.status === "rejected") throw notices.reason;
    const warnings = [];
    if (notices.status === "rejected") warnings.push("Notifications could not be loaded. Showing available activity log entries. Try refreshing.");
    if (count.status === "rejected") warnings.push(countWarning());
    if (logs.status === "rejected") warnings.push("Activity log notifications could not be loaded. Showing available notifications. Try refreshing.");
    const auditLogs = logs.status === "fulfilled" ? logs.value : [];
    let auditReadIds = new Set();
    if (logs.status === "fulfilled") {
      try { auditReadIds = initializeNotificationReadIds(readKey, auditLogs.map(log => `audit-log:${log.id}`), window.localStorage); }
      catch { auditReadIds = new Set(auditLogs.map(log => `audit-log:${log.id}`)); }
    }
    const notifications = notices.status === "fulfilled" ? notices.value : [];
    return { notifications, requests: [], auditLogs, auditReadIds,
      unreadCount: count.status === "fulfilled" ? count.value : fallbackUnreadCount(notifications), warning: warnings.join(" ") };
  }
  if (normalized !== "instructor") {
    const [notices, count] = await Promise.allSettled([getNotifications(), getNotificationUnreadCount()]);
    if (notices.status === "rejected") throw notices.reason;
    return { notifications: notices.value, requests: [], auditLogs: [],
      unreadCount: count.status === "fulfilled" ? count.value : fallbackUnreadCount(notices.value), warning: count.status === "rejected" ? countWarning() : "" };
  }
  const [notices, count, submissions] = await Promise.allSettled([getNotifications(), getNotificationUnreadCount(), loadRequests()]);
  if (notices.status === "rejected" && submissions.status === "rejected") throw notices.reason;
  const warnings = [];
  if (notices.status === "rejected") warnings.push("Notifications could not be loaded. Showing available request activity. Try refreshing.");
  if (count.status === "rejected") warnings.push(countWarning());
  if (submissions.status === "rejected") warnings.push("Request activity could not be loaded. Showing available notifications. Try refreshing.");
  const notifications = notices.status === "fulfilled" ? notices.value : [];
  return { notifications, unreadCount: count.status === "fulfilled" ? count.value : fallbackUnreadCount(notifications),
    requests: submissions.status === "fulfilled" ? submissions.value : [], warning: warnings.join(" ") };
}

export async function loadNotificationPreview(userId) {
  const preview = await getNotificationPreview();
  return cachePreview(userId, { notifications: preview.notifications, requests: [], auditLogs: [], warning: "", unreadCount: preview.unreadCount, readError: "" });
}

export async function markFeedRead(userId, items, all = false, role = "student") {
  const serverIds = [...new Set(items.filter(item => !item.source).flatMap(item => item.notificationIds || [item.id]))];
  let failure;
  let confirmedIds = serverIds;
  if (all) await markAllNotificationsRead();
  else if (serverIds.length) {
    const results = await Promise.allSettled(serverIds.map(markNotificationRead));
    confirmedIds = serverIds.filter((_, index) => results[index].status === "fulfilled");
    failure = results.find(result => result.status === "rejected")?.reason;
  }
  cachedPreviewWithReadIds(userId, confirmedIds, all);
  syncConfirmedReads(userId, role, confirmedIds, all);
  const localItems = items.filter(item => item.source);
  for (const readKey of new Set(localItems.map(item => item.readKey || `instructor:${userId}`))) {
    markNotificationsRead(readKey, localItems.filter(item => (item.readKey || `instructor:${userId}`) === readKey).map(item => item.id), window.localStorage);
  }
  if (failure) throw failure;
}
