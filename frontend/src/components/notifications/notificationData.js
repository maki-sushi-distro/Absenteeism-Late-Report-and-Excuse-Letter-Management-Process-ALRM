import { normalizeRole } from "../../lib/roles.js";

const recipients = {
  request_decision: ["student"],
  request_updated: ["student"],
  new_request: ["instructor"],
  followup_flag: ["program"],
  threshold_warning: ["instructor", "program"],
  ir_escalation: ["instructor", "program"],
  attendance_warning: ["instructor", "program"],
  attendance_ir: ["instructor", "program"],
};

function destination(role, requestId) {
  const normalized = normalizeRole(role);
  if (normalized === "instructor") return `/instructor/class-requests${requestId ? `?request=${encodeURIComponent(requestId)}` : ""}`;
  if (normalized === "program") return "/program-head/requests";
  if (normalized === "student") return `/student/records${requestId ? `?request=${encodeURIComponent(requestId)}` : ""}`;
  return "/dashboard";
}

export function notificationActivity(records, role, preferences, userId) {
  const normalizedRole = normalizeRole(role);
  const seen = new Set();
  return records.flatMap(record => {
    if (!record?.id || seen.has(record.id) || !record.message || !Number.isFinite(Date.parse(record.date_sent))) return [];
    if (userId != null && String(record.user_id) !== String(userId)) return [];
    // Preserve generic notices for their recipient; known events follow backend audiences.
    if (Object.hasOwn(recipients, record.type) && !recipients[record.type].includes(normalizedRole)) return [];
    seen.add(record.id);
    const threshold = ["threshold_warning", "ir_escalation", "attendance_warning", "attendance_ir"].includes(record.type);
    if (!(threshold ? preferences.thresholdAlerts : preferences.requestUpdates)) return [];
    return [{ id: record.id, type: record.type, requestId: record.request_id, message: record.message, date: record.date_sent, isRead: record.is_read === true, href: destination(role, record.request_id) }];
  }).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function mergeRequestActivity(activity, requests, user, readIds = new Set()) {
  if (normalizeRole(user.role) !== "instructor") return activity;
  const seen = new Set();
  const combined = activity.filter(item => {
    if (item.type !== "new_request" || !item.requestId) return true;
    if (seen.has(String(item.requestId))) return false;
    seen.add(String(item.requestId));
    return true;
  });
  for (const request of requests) {
    const student = request?.enrollment?.student;
    const course = request?.enrollment?.class;
    if (!request?.id || seen.has(String(request.id)) || !["absence", "late"].includes(request.type)) continue;
    if (!student?.name || !course?.subject_name || String(course.instructor_id) !== String(user.id)) continue;
    if (!Number.isFinite(Date.parse(request.date_submitted))) continue;
    seen.add(String(request.id));
    const id = `request-submitted:${request.id}`;
    combined.push({ id, type: "new_request", source: "request", requestId: request.id,
      message: `${student.name} submitted a new ${request.type} request for ${course.subject_name}.`,
      date: request.date_submitted, isRead: readIds.has(id), href: destination(user.role, request.id),
      readStatusTitle: "Request activity: read status is saved on this browser.",
      unreadTitle: "Unread request activity on this browser",
    });
  }
  return combined.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}
