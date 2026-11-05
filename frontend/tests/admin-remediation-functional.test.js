import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { mockApiFetch } from "./helpers/mockApiFetch.js";

afterEach(() => mock.restoreAll());

test("Class Management requests one filtered server page", async () => {
  const { getClassesPage } = await import("../src/api/admin.js");
  const calls = [];
  mockApiFetch(async (url) => {
    calls.push(String(url));
    return Response.json({ success: true, data: [{ id: "class-11" }], meta: { page: 2, per_page: 10, last_page: 3, total: 21 } });
  });

  const result = await getClassesPage({ page: 2, filters: { search: "  Math  ", programId: "program-1" } });

  const url = new URL(calls[0], "https://example.test");
  assert.deepEqual(Object.fromEntries(url.searchParams), { search: "Math", program_id: "program-1", page: "2", per_page: "10" });
  assert.equal(result.data.length, 1);
  assert.equal(result.meta.total, 21);
});

test("Generated report hides Request ID without removing it from export data", async () => {
  const { reportHeadings, visibleReportHeadings } = await import("../src/pages/auth/admin/reports/reportData.js");

  assert.ok(reportHeadings.includes("Request ID"));
  assert.equal(visibleReportHeadings.includes("Request ID"), false);
  assert.equal(visibleReportHeadings.length, reportHeadings.length - 1);
});

test("Academic period accepts only consecutive school years", async () => {
  const { isConsecutiveSchoolYear } = await import("../src/api/academicPeriod.js");

  assert.equal(isConsecutiveSchoolYear("2026-2027"), true);
  assert.equal(isConsecutiveSchoolYear("2026-2028"), false);
  assert.equal(isConsecutiveSchoolYear("2026/2027"), false);
});
