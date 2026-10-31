import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;

before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
});

after(async () => {
  await server?.close();
});

test("Generate is unavailable until both report dates are present", async () => {
  const { default: AdminReports } = await server.ssrLoadModule("/src/pages/auth/admin/reports/AdminReports.jsx");
  const { reportDatesComplete } = await server.ssrLoadModule("/src/pages/auth/admin/reports/reportValidation.js");

  assert.equal(reportDatesComplete({ date_from: "", date_to: "" }), false);
  assert.equal(reportDatesComplete({ date_from: "2026-10-01", date_to: "" }), false);
  assert.equal(reportDatesComplete({ date_from: "", date_to: "2026-10-31" }), false);
  assert.equal(reportDatesComplete({ date_from: "2026-10-01", date_to: "2026-10-31" }), true);

  const html = renderToStaticMarkup(React.createElement(AdminReports, { programs: [] }));
  assert.match(html, /<button\b[^>]*disabled=""[^>]*>Generate<\/button>/);
});
