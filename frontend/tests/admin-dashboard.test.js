import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import { academicTermLabel } from "../src/pages/auth/admin/dashboard/adminOverviewData.js";

test("academic terms come from classes, without inventing a current semester", () => {
  assert.equal(academicTermLabel([{ semester: "1st", school_year: "2026-2027" }]), "1st Semester, A.Y. 2026-2027");
  assert.equal(academicTermLabel([]), "College-wide overview");
  assert.equal(academicTermLabel([{ semester: "1st", school_year: "2026-2027" }, { semester: "2nd", school_year: "2026-2027" }]), "College-wide overview");
});

let server, Overview;
before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
  ({ default: Overview } = await server.ssrLoadModule("/src/pages/auth/admin/dashboard/AdminOverview.jsx"));
});
after(async () => { await server?.close(); });
const resources = { dashboard: { total_students: 110, total_instructors: 20, total_programs: 4, pending_staff_approvals: 14 }, users: [{ id: "one", name: "Ana Student", role: "student", status: "pending", year_level: "1st", program: { program_name: "Information Systems" } }], programs: [], classes: [{ id: "c1", instructor_id: "assigned-1" }, { id: "c2", instructor_id: "assigned-1" }, { id: "c3", active_teaching_assignment: { instructor_id: "assigned-2" } }], loading: {}, ready: { dashboard: true, classes: true }, errors: {} };
const render = props => renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(Overview, { resources, onRetry() {}, ...props })));

test("overview removes pending-account metrics and preview", () => {
  const html = render();
  for (const label of ["Welcome back, Admin!", "Total Students", "Total Instructors", "Total Programs", ">110<", ">2<", "Quick Access", "Manage users", "Export Report", "System Settings"]) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, />20</);
  for (const removed of ["Pending for Approval", "Pending Account Approvals", "Ana Student", ">14<"]) assert.doesNotMatch(html, new RegExp(removed));
  for (const path of ["/user-management", "/reports", "/settings"]) assert.ok(html.includes(`href="${path}"`), path);
  assert.doesNotMatch(html, /tab=waiting/);
  assert.doesNotMatch(html, /Staff role assignment|Create class|Create program/);
  assert.match(html, /This week/);
  assert.match(html, /Last week/);
  assert.match(html, /Loading weekly reports/);
});

test("dashboard skeleton matches three cards and the independently loading chart", () => {
  const html = render({ resources: { ...resources, dashboard: null, users: [], loading: { dashboard: true, users: true, programs: true, classes: true }, ready: {} } });
  assert.match(html, /data-slot="dashboard-skeleton"/);
  assert.equal((html.match(/data-slot="metric-placeholder"/g) || []).length, 3);
  assert.match(html, /data-slot="activity-chart-placeholder"/);
  assert.doesNotMatch(html, /data-slot="approval-placeholder"/);
  assert.doesNotMatch(html, />110<|Ana Student/);
});

test("admin total programs excludes General Education when program data has loaded", () => {
  const html = render({ resources: {
    ...resources,
    dashboard: { ...resources.dashboard, programs_summary: [{ id: "ge", program_name: "General Education" }, { id: "bsis", program_name: "BS in Information Systems" }] },
    ready: { programs: true },
  } });
  assert.match(html, /Total Programs<\/p><p[^>]*>1<\/p>/);
});
