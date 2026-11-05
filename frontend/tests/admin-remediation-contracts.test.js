import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mockApiFetch } from "./helpers/mockApiFetch.js";
import { getAdminAuditLogsPage } from "../src/api/admin.js";
import { notificationActivity } from "../src/components/notifications/notificationData.js";

afterEach(() => mock.restoreAll());

test("Admin user list requests only the selected filtered page", async () => {
  const { getUserManagementUsersPage } = await import("../src/api/adminUserManagement.js");
  const calls = [];
  mockApiFetch(async (url) => {
    calls.push(String(url));
    const requestedPage = Number(new URL(String(url), "https://example.test").searchParams.get("page"));
    return Response.json({ success: true, data: requestedPage > 7 ? [] : [{ id: "user-11" }], meta: { page: requestedPage, per_page: 10, last_page: 7, total: 61 } });
  });

  const result = await getUserManagementUsersPage({
    page: 2,
    perPage: 10,
    filters: { search: "  Alex  ", role: "student", status: "approved", program: "program-1", year: "3" },
  });

  const url = new URL(calls[0], "https://example.test");
  assert.equal(url.pathname, "/api/admin/users");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    search: "Alex", role: "student", status: "approved", program_id: "program-1", year_level: "3rd", page: "2", per_page: "10",
  });
  assert.deepEqual(result, { data: [{ id: "user-11" }], meta: { page: 2, per_page: 10, last_page: 7, total: 61 } });

  const outOfRange = await getUserManagementUsersPage({ page: 9, perPage: 10 });
  assert.deepEqual(outOfRange, { data: [], meta: { page: 9, per_page: 10, last_page: 7, total: 61 } });
});

test("Activity filters translate display labels to backend action keys", async () => {
  const calls = [];
  mockApiFetch(async (url) => {
    calls.push(String(url));
    return Response.json({ success: true, data: [], meta: { page: 1, per_page: 10, last_page: 1, total: 0 } });
  });

  await getAdminAuditLogsPage({ filters: { action: "Denied" } });

  const url = new URL(calls[0], "https://example.test");
  assert.equal(url.searchParams.get("action"), "decided_request_invalid");
});

test("Direct and audit request notifications deduplicate by event and request", () => {
  const records = [
    { id: "direct-submit", user_id: "instructor-1", type: "new_request", request_id: "request-1", message: "Alex just submitted an absence request for Math.", date_sent: "2026-11-05T08:00:00Z" },
    { id: "audit-submit", user_id: "instructor-1", type: "activity_submitted_request", request_id: "request-1", message: "Alex submitted a request: Alex's absence request for Math.", date_sent: "2026-11-05T08:00:01Z" },
    { id: "direct-followup", user_id: "instructor-1", type: "request_followup", request_id: "request-1", message: "Alex just followed up the absence request on Math.", date_sent: "2026-11-05T09:00:00Z" },
  ];

  const result = notificationActivity(records, "instructor", { requestUpdates: true, thresholdAlerts: true }, "instructor-1");

  assert.equal(result.length, 2);
  assert.deepEqual(result.find((item) => item.type === "new_request").notificationIds, ["direct-submit", "audit-submit"]);
  assert.ok(result.some((item) => item.type === "request_followup"));
});
