import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import { getPostLoginPath, rememberAuthenticatedPage } from "../src/api/authSecurity.js";

let server;
before(async () => { server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" }); });
after(async () => { await server?.close(); });

test("the signed-out page shows the current school branding and a link back to the existing login", async () => {
  const Page = (await server.ssrLoadModule("/src/pages/auth/SignedOut/index.js")).default;
  const { AuthProvider } = await server.ssrLoadModule("/src/context/AuthContext.jsx");
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ["/signed-out"] },
    React.createElement(AuthProvider, null, React.createElement(Page))));
  assert.match(html, /You&#x27;ve been signed out/);
  assert.match(html, /Thanks for using the system/);
  assert.match(html, /LV_Logo\.png/);
  assert.match(html, /LV_Picture\.jpg/);
  assert.match(html, /alt="La Verdad Christian College logo"/);
  assert.match(html, /<a[^>]*href="\/login"[^>]*>/);
  assert.match(html, /Sign in again/);
});

test("confirmed logout starts the existing request and navigates without waiting on the network", async () => {
  const { logoutToSignedOut } = await import("../src/lib/logout.js");
  const actions = [];
  let finish;
  const pending = new Promise(resolve => { finish = resolve; });
  const result = logoutToSignedOut(() => { actions.push("logout"); return pending; },
    (path, options) => actions.push({ path, options }));
  assert.deepEqual(actions, ["logout", { path: "/signed-out", options: { replace: true } }]);
  let completed = false;
  result.then(() => { completed = true; });
  await Promise.resolve();
  assert.equal(completed, false);
  finish();
  await result;
  assert.equal(completed, true);
});

test("confirmed logout explicitly identifies the destination before the route guard sees an empty session", async () => {
  const { logoutToSignedOut } = await import("../src/lib/logout.js");
  let options;
  await logoutToSignedOut((value) => { options = value; return Promise.resolve(); }, () => {});
  assert.deepEqual(options, { redirectToSignedOut: true });
});

test("signed-out URLs cannot replace the remembered dashboard destination", () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } });
  const user = { id: "student-1", role: "student", program_id: "program-1", year_level: "3rd", school_student_id: "2026-001" };
  try {
    rememberAuthenticatedPage(user, "/student/records");
    rememberAuthenticatedPage(user, "/signed-out");
    assert.equal(getPostLoginPath(user), "/student/records");
    values.set("alrm_last_page:student-1", "/signed-out");
    assert.equal(getPostLoginPath(user), "/dashboard");
  } finally {
    if (originalStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", originalStorage);
  }
});

test("the public route and every active role sidebar use the signed-out destination", async () => {
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  assert.match(app, /<Route path="\/signed-out" element=\{<SignedOut \/>\} \/>/);
  for (const path of ["pages/auth/student/StudentSidebar.jsx", "pages/auth/instructor/InstructorSidebar.jsx", "pages/auth/admin/Sidebar.jsx", "components/navigation/RoleSidebar/RoleSidebar.jsx"]) {
    const source = await readFile(new URL(`../src/${path}`, import.meta.url), "utf8");
    assert.match(source, /return logoutToSignedOut\(logout, navigate\)/, path);
  }
});
