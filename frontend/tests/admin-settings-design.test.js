import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server;

before(async () => {
  globalThis.window = new EventTarget();
  window.localStorage = { getItem: () => null, setItem() {} };
  server = await createServer({
    server: { middlewareMode: true, ws: false },
    appType: "custom",
    plugins: [{
      name: "admin-settings-fixture",
      enforce: "pre",
      transform(code, id) {
        const path = id.replaceAll("\\", "/");
        if (path.endsWith("/src/context/AuthContext.jsx")) {
          return `export function useAuth() { return { loading: false, refreshUser() {}, user: { id: "admin-one", name: "Jane Dela Cruz", email: "admin@laverdad.edu.ph", role: "administrator", school_id_number: "FAC-0091", email_notifications_enabled: true, program: { program_name: "Office of the Chancellor" } } }; }`;
        }
        if (path.endsWith("/src/pages/auth/admin/AdminPageLayout.jsx")) {
          return `export default function AdminPageLayout({ children }) { return children; }`;
        }
      },
    }],
  });
});

after(async () => {
  await server?.close();
  delete globalThis.window;
});

test("administrator settings use the faculty profile design without removing working controls", async () => {
  const Settings = (await server.ssrLoadModule("/src/pages/auth/Settings.jsx")).default;
  const html = renderToStaticMarkup(React.createElement(Settings));

  for (const text of [
    "Faculty Profile",
    "Full Name",
    "Faculty ID",
    "Department",
    "Email Address",
    "Jane Dela Cruz",
    "FAC-0091",
    "Office of the Chancellor",
    "admin@laverdad.edu.ph",
  ]) assert.ok(html.includes(text), text);

  assert.doesNotMatch(html, /Admin Profile/);
  assert.equal((html.match(/\sreadonly(?:=""|(?=[\s>]))/gi) || []).length, 4);
  assert.ok(html.indexOf("Faculty Profile") < html.indexOf("Notification Preferences"));
  assert.ok(html.indexOf("Notification Preferences") < html.indexOf("Absenteeism &amp; Late Policy"));
  for (const text of ["New requests from students", "Attendance threshold warnings", "Email notifications", "Edit academic period", "Save academic period"]) {
    assert.ok(html.includes(text), text);
  }
  assert.match(html, /Controls the default data shown in dashboards, classes, attendance, and reports\./);
  assert.match(html, /Existing records are preserved\./);
  assert.match(html, /Loading current academic period/);
  assert.equal((html.match(/role="switch"/g) || []).length, 3);
});
