import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

let server;
before(async () => { server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" }); });
after(async () => { await server?.close(); });
beforeEach(() => {
  globalThis.window = new EventTarget();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => "test-session" } });
});
afterEach(() => { mock.restoreAll(); delete globalThis.window; delete globalThis.localStorage; });
async function load(path) {
  const url = new URL(`../src/${path}`, import.meta.url);
  assert.ok(existsSync(url), `Missing shared notification module: ${path}`);
  return import(url);
}

test("staff notifications use authenticated shared GET and PATCH endpoints", async () => {
  const api = await load("api/notifications.js");
  const calls = [];
  mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), method: options.method || "GET", headers: options.headers, body: options.body });
    const data = calls.length === 1 ? [] : calls.length === 2 ? { id: "note/one", is_read: true } : null;
    return Response.json({ success: true, data });
  });
  assert.deepEqual(await api.getNotifications(), []);
  await api.markNotificationRead("note/one");
  await api.markAllNotificationsRead();
  assert.deepEqual(calls.map(call => [call.url, call.method]), [["/api/notifications", "GET"], ["/api/notifications/note%2Fone/read", "PATCH"], ["/api/notifications/read-all", "PATCH"]]);
  assert.ok(calls.every(call => call.headers.get("Authorization") === "Bearer test-session"));
  assert.ok(calls.every(call => call.body === undefined));
});

test("notification errors and unconfirmed read operations never become fake success", async () => {
  const api = await load("api/notifications.js");
  const fetch = mock.method(globalThis, "fetch", async () => Response.json({ message: "Forbidden" }, { status: 403 }));
  await assert.rejects(api.getNotifications(), /Forbidden/);
  fetch.mock.mockImplementation(async () => Response.json({ success: true, data: {} }));
  await assert.rejects(api.getNotifications(), /unexpected/i);
  await assert.rejects(api.markNotificationRead("one"), /confirm/i);
  fetch.mock.mockImplementation(async () => Response.json({ success: false, message: "Could not save" }));
  await assert.rejects(api.markAllNotificationsRead(), /Could not save/);
});

test("staff feeds honor the saved request and threshold preferences without inventing decisions", async () => {
  const { notificationActivity } = await load("components/notifications/notificationData.js");
  const rows = [
    { id: "request", request_id: "r/one", type: "new_request", message: "Request updated", date_sent: "2026-10-22T08:00:00Z", is_read: true, channel: "in_app" },
    { id: "warning", request_id: "r/two", type: "threshold_warning", message: "Attendance warning", date_sent: "2026-10-23T08:00:00Z", is_read: false, channel: "in_app" },
    { id: "email", type: "request_decision", date_sent: "2026-10-23", channel: "email" },
    { id: "invalid", date_sent: "not-a-date" },
  ];
  const all = notificationActivity(rows, "instructor", { requestUpdates: true, thresholdAlerts: true });
  assert.deepEqual(all.map(item => item.id), ["warning", "request"]);
  assert.equal(all[1].href, "/instructor/class-requests?request=r%2Fone");
  assert.equal(all[1].isRead, true);
  assert.equal(all[1].status, undefined);
  assert.deepEqual(notificationActivity(rows, "instructor", { requestUpdates: false, thresholdAlerts: true }).map(item => item.id), ["warning"]);
  assert.deepEqual(notificationActivity(rows, "instructor", { requestUpdates: true, thresholdAlerts: false }).map(item => item.id), ["request"]);
  assert.equal(notificationActivity(rows, "instructor", { requestUpdates: false, thresholdAlerts: false }).length, 0);
});

test("staff notification UI reuses the student controls with correct destinations and server read labels", async () => {
  const Header = (await server.ssrLoadModule("/src/pages/auth/student/notifications/NotificationHeader.jsx")).default;
  const nodes = [];
  function visit(node) { if (!React.isValidElement(node)) return; nodes.push(node); React.Children.forEach(node.props.children, visit); }
  visit(Header({ notificationsPath: "/notifications", readStatusTitle: "Saved to your account" }));
  assert.ok(nodes.some(node => node.props.render?.props.to === "/notifications"));
  const View = (await server.ssrLoadModule("/src/pages/auth/student/notifications/NotificationsView.jsx")).default;
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(View, { activity: [{ id: "one", href: "/instructor/class-requests?request=one", message: "New class request", date: "2026-10-23" }], readStatusTitle: "Saved to your account", unreadTitle: "Unread in your account", reload() {} })));
  assert.match(html, /href="\/instructor\/class-requests\?request=one"/);
  assert.match(html, /Saved to your account/);
  assert.doesNotMatch(html, /href="\/student\/records/);
});

test("the instructor inbox keeps backend notifications from students, program heads and administrators", async () => {
  const { notificationActivity } = await load("components/notifications/notificationData.js");
  const rows = ["Student follow-up", "Program head notice", "Administrator notice"].map((message, index) => ({ id: `notice-${index}`, type: "request_update", message, date_sent: "2026-10-23T08:00:00Z", channel: "in_app", is_read: false }));
  const activity = notificationActivity(rows, "instructor", { requestUpdates: true, thresholdAlerts: true });
  assert.deepEqual(activity.map(item => item.message), rows.map(item => item.message));
  assert.ok(activity.every(item => item.href === "/instructor/class-requests"));
});

test("instructor feeds exclude personal student results but include the backend's email-channel new-request event", async () => {
  const { notificationActivity } = await load("components/notifications/notificationData.js");
  const rows = [
    { id: "personal", type: "request_decision", message: "Your absence request was marked invalid", date_sent: "2026-10-23", channel: "in_app" },
    { id: "personal-email", type: "request_updated", message: "Your instructor has taken action", date_sent: "2026-10-23", channel: "email" },
    { id: "incoming", type: "new_request", message: "A student submitted a new absence request", request_id: "incoming-request", date_sent: "2026-10-23", channel: "email" },
  ];
  const preferences = { requestUpdates: true, thresholdAlerts: true };
  assert.deepEqual(notificationActivity(rows, "instructor", preferences).map(item => item.id), ["incoming"]);
  assert.ok(notificationActivity(rows, "student", preferences).some(item => item.id === "personal"));
});

test("role-specific events and recipients cannot cross into another role's inbox", async () => {
  const { notificationActivity } = await load("components/notifications/notificationData.js");
  const types = ["request_decision", "request_updated", "new_request", "followup_flag", "threshold_warning", "ir_escalation", "school_notice"];
  const rows = types.map(type => ({ id: type, type, user_id: "owner", message: type, date_sent: "2026-10-23", channel: "in_app" }));
  const preferences = { requestUpdates: true, thresholdAlerts: true };
  const visible = role => notificationActivity(rows, role, preferences, "owner").map(item => item.id);
  assert.deepEqual(visible("instructor"), ["new_request", "threshold_warning", "ir_escalation", "school_notice"]);
  assert.deepEqual(visible("program_head"), ["followup_flag", "threshold_warning", "ir_escalation", "school_notice"]);
  assert.deepEqual(visible("administrator"), ["school_notice"]);
  assert.equal(notificationActivity(rows, "instructor", preferences, "another-user").length, 0);
});

test("an instructor's absence notification is retained alongside late notifications regardless of delivery channel", async () => {
  const { notificationActivity } = await load("components/notifications/notificationData.js");
  const rows = [
    { id: "absence", user_id: "teacher", request_id: "absence-one", type: "new_request", message: "A student submitted a new absence request", date_sent: "2026-10-23T08:00:00Z", channel: "email" },
    { id: "late", user_id: "teacher", request_id: "late-one", type: "new_request", message: "Another student submitted a new late request", date_sent: "2026-10-22T08:00:00Z", channel: "in_app" },
    { id: "other-instructor", user_id: "another-teacher", type: "new_request", message: "Another class request", date_sent: "2026-10-23T09:00:00Z" },
  ];
  const activity = notificationActivity(rows, "instructor", { requestUpdates: true, thresholdAlerts: true }, "teacher");
  assert.deepEqual(activity.map(item => item.id), ["absence", "late"]);
  assert.equal(activity[0].href, "/instructor/class-requests?request=absence-one");
  assert.deepEqual(notificationActivity([], "instructor", { requestUpdates: true }, "teacher"), []);
});

test("preferences are separated by account role without losing existing student preferences", async () => {
  const { notificationPreferenceKey } = await server.ssrLoadModule("/src/hooks/useNotificationPreferences.js");
  assert.equal(notificationPreferenceKey("one", "student"), "alrm:student-preferences:one");
  assert.notEqual(notificationPreferenceKey("one", "instructor"), notificationPreferenceKey("one", "student"));
  assert.notEqual(notificationPreferenceKey("one", "instructor"), notificationPreferenceKey("one", "admin"));
  assert.equal(notificationPreferenceKey("one", "program_head"), notificationPreferenceKey("one", "program"));
});

test("all staff shells have a functional bell and the full notification page is protected", async () => {
  for (const path of ["pages/auth/instructor/InstructorPageLayout.jsx", "pages/auth/admin/AdminPageLayout.jsx", "components/navigation/DashboardPageLayout/DashboardHeader.jsx"]) {
    const source = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
    assert.match(source, /<NotificationBell user=\{user\}/);
  }
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /path="\/notifications" element=\{<ProtectedRoute><Notifications/);
  assert.match(app, /<InstructorRequests\s*\/>/);
});

test("settings remove Account & Security and use the working shared preference controls", async () => {
  const source = await readFile(new URL("../src/pages/auth/Settings.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /SecurityCard|Account & Security|Change Password|Manage Notifications/);
  assert.match(source, /<NotificationPreferences\s/);
  assert.ok(existsSync(new URL("../src/components/notifications/NotificationPreferences.jsx", import.meta.url)));
  const Preferences = (await server.ssrLoadModule("/src/components/notifications/NotificationPreferences.jsx")).default;
  const html = renderToStaticMarkup(React.createElement(Preferences, { userId: "instructor-one", role: "instructor" }));
  assert.match(html, /Request activity updates/);
  assert.match(html, /Attendance threshold alerts/);
  assert.match(html, /Email notifications/);
  assert.match(html, /managed by your school/);
});

test("a student preview cannot load or display its student inbox inside the instructor bell", async () => {
  const Bell = (await server.ssrLoadModule("/src/components/notifications/NotificationBell.jsx")).default;
  const fetch = mock.method(globalThis, "fetch", async () => { throw new Error("Preview must not load a different role's inbox"); });
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Bell, { user: { id: "student-preview", role: "student" }, audience: "instructor" })));
  assert.match(html, /instructor account required/i);
  assert.equal(fetch.mock.callCount(), 0);
  const source = await readFile(new URL("../src/components/notifications/NotificationBell.jsx", import.meta.url), "utf8");
  assert.match(source, /normalizeRole\(user\.role\) !== normalizeRole\(audience\)/);
});
