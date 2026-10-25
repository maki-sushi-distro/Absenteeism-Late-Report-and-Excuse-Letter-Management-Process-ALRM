import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

let server;
let SessionStatus;
let SessionTestContext;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, ws: false },
    appType: "custom",
    plugins: [{
      name: "session-loading-test-context",
      enforce: "pre",
      transform(code, id) {
        // Supply session states without running auth effects or changing its source file.
        if (id.replaceAll("\\", "/").endsWith("/src/context/AuthContext.jsx")) {
          return `${code}\nexport { AuthContext as SessionTestContext };`;
        }
      },
    }],
  });
  ({ SessionTestContext } = await server.ssrLoadModule("/src/context/AuthContext.jsx"));
  ({ default: SessionStatus } = await server.ssrLoadModule("/src/components/SessionStatus.jsx"));
});

after(async () => { await server?.close(); });

function renderSession(path, state = {}) {
  let element;
  function Capture() {
    element = SessionStatus();
    return element;
  }
  const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] },
    React.createElement(SessionTestContext.Provider, {
      value: { loading: true, sessionError: "", refreshUser() {}, user: null, ...state },
    }, React.createElement(Capture))));
  return { html, element };
}

test("login, Google callback and OTP session checks retain the single school-logo loader", () => {
  for (const path of ["/login", "/login/", "/login?next=/dashboard", "/auth/callback", "/auth/otp", "/auth/other", "/verify-otp", "/verify-otp/?exchange_code=test"]) {
    const { html } = renderSession(path);
    assert.match(html, /data-slot="auth-loading"/, path);
    assert.match(html, /La Verdad Christian College logo/, path);
    assert.match(html, /Signing you in/, path);
    assert.equal((html.match(/role="status"/g) || []).length, 1, path);
    assert.doesNotMatch(html, /data-slot="session-restore-skeleton"|data-slot="skeleton"/, path);
  }
});

const protectedPaths = [
  ["/", "dashboard"], ["/dashboard", "dashboard"], ["/dashboard/?tab=overview", "dashboard"],
  ["/students", "table"], ["/instructors", "table"], ["/user-management", "table"],
  ["/programs", "table"], ["/classes", "table"], ["/reports", "table"],
  ["/student/records", "table"], ["/student/notifications", "table"],
  ["/instructor/class-records", "table"], ["/instructor/class-records/42", "table"],
  ["/instructor/class-requests", "table"], ["/program-head/requests", "table"],
  ["/program-head/flagged", "table"], ["/program-head/instructors", "table"],
  ["/program-head/reports", "table"],
  ["/settings", "profile"], ["/settings/", "profile"], ["/students/42", "profile"],
  ["/program-head/instructors/42", "profile"],
  ["/students/add", "form"], ["/instructors/add", "form"],
  ["/student/request", "form"], ["/complete-profile", "form"],
  ["/unknown-app-page", "table"], ["/login-history", "table"],
];

for (const [path] of protectedPaths) {
  test(`session restoration at ${path} shows the centered logo before page skeletons`, () => {
    const { html } = renderSession(path);
    assert.match(html, /data-slot="auth-loading"/);
    assert.match(html, /La Verdad Christian College logo/);
    assert.match(html, /min-h-screen place-items-center/);
    assert.match(html, /<main\b/);
    assert.match(html, /aria-busy="true"/);
    assert.equal((html.match(/role="status"/g) || []).length, 1);
    assert.match(html, /aria-label="Loading ALRM System\.\.\."/);
    assert.doesNotMatch(html, /Signing you in|session-restore-skeleton|data-slot="skeleton"|<(button|input|select|a)\b/);
    assert.doesNotMatch(html, /data-variant="(student|admin|instructor|program)"/);
  });
}

test("restoration never presents unvalidated account data or a role-specific dashboard", () => {
  const { html } = renderSession("/dashboard", {
    user: { name: "UNVALIDATED ACCOUNT", role: "admin", email: "private@example.test" },
  });
  assert.doesNotMatch(html, /UNVALIDATED ACCOUNT|private@example\.test|data-variant="admin"/);
  assert.match(html, /data-slot="auth-loading"/);
  assert.doesNotMatch(html, /data-slot="skeleton"/);
});

test("a settled session failure keeps HTTP 503, its description and the exact retry callback", () => {
  const refreshUser = () => {};
  for (const path of ["/login", "/dashboard", "/settings"]) {
    const { html, element } = renderSession(path, {
      loading: false, sessionError: "Saved session could not be checked", refreshUser,
    });
    assert.equal(element.props.status, 503);
    assert.equal(element.props.description, "Saved session could not be checked");
    assert.equal(element.props.onRetry, refreshUser);
    assert.match(html, /503/);
    assert.match(html, /Saved session could not be checked/);
    assert.match(html, /Try again/);
    assert.doesNotMatch(html, /session-restore-skeleton|auth-loading|role="status"/);
  }
});

test("returning accounts show the same logo regardless of a stale layout hint", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const items = new Map();
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) } });
  try {
    for (const role of ["instructor", "student", "program", "admin"]) {
      items.set("alrm_loading_layout", role);
      const { html } = renderSession("/dashboard", { user: { name: "UNVALIDATED ACCOUNT", email: "private@example.test" } });
      assert.match(html, /data-slot="auth-loading"/);
      assert.doesNotMatch(html, /data-slot="metric-placeholder"/);
      assert.equal((html.match(/role="status"/g) || []).length, 1);
      assert.doesNotMatch(html, /UNVALIDATED ACCOUNT|private@example\.test|<(button|input|a)\b/);
    }
  } finally {
    if (original) Object.defineProperty(globalThis, "sessionStorage", original);
    else delete globalThis.sessionStorage;
  }
});

test("the startup logo never mounts protected content or overrides the server's role", async () => {
  const { ProtectedRoute } = await server.ssrLoadModule("/src/routes/ProtectedRoute.jsx");
  const originalSession = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const originalLocal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const items = new Map();
  const storage = { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) };
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: storage });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try {
    items.set("alrm_loading_layout", "instructor");
    const render = state => renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ["/instructor/class-requests"] }, React.createElement(SessionTestContext.Provider, { value: { user: null, loading: false, sessionError: "", ...state } }, React.createElement(ProtectedRoute, { allowedRoles: ["instructor"] }, React.createElement("p", null, "PROTECTED CONTENT")))));
    assert.doesNotMatch(render({ loading: true }), /PROTECTED CONTENT/);
    assert.doesNotMatch(render({}), /PROTECTED CONTENT/);
    const wrongRole = render({ user: { id: "verified-admin", role: "administrator" } });
    assert.doesNotMatch(wrongRole, /PROTECTED CONTENT/);
    assert.match(wrongRole, /403/);
    assert.match(render({ user: { id: "verified-instructor", role: "instructor", program_id: "program-one" } }), /PROTECTED CONTENT/);
  } finally {
    for (const [key, descriptor] of [["sessionStorage", originalSession], ["localStorage", originalLocal]]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

test("verified SPA routes show their page skeleton without replaying the startup logo", async () => {
  const { ProtectedRoute } = await server.ssrLoadModule("/src/routes/ProtectedRoute.jsx");
  const Page = (await server.ssrLoadModule("/src/pages/auth/instructor/InstructorRequests/index.js")).default;
  const originalWindow = globalThis.window;
  globalThis.window = { innerWidth: 1280, localStorage: { getItem: () => null } };
  try {
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: ["/instructor/class-requests"] },
      React.createElement(SessionTestContext.Provider, { value: {
        user: { id: "verified-instructor", role: "instructor", program_id: "program-one", name: "Preview Instructor" },
        loading: false, sessionError: "",
      } }, React.createElement(ProtectedRoute, { allowedRoles: ["instructor"] }, React.createElement(Page)))));
    assert.match(html, /data-slot="table-page-skeleton"/);
    assert.match(html, /data-layout="requests"/);
    assert.doesNotMatch(html, /auth-loading|session-restore-skeleton|Loading ALRM System/);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});
