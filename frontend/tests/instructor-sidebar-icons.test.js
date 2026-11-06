import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

let server;
before(async () => { server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" }); });
after(async () => { await server?.close(); });

async function renderSidebar(path = "/instructor/class-requests", modulePath = "/src/pages/auth/instructor/InstructorSidebar.jsx") {
  const Sidebar = (await server.ssrLoadModule(modulePath)).default;
  const { AuthProvider } = await server.ssrLoadModule("/src/context/AuthContext.jsx");
  const previous = globalThis.window;
  globalThis.window = { innerWidth: 1280, localStorage: { getItem: () => null } };
  try {
    return renderToStaticMarkup(React.createElement(MemoryRouter, { initialEntries: [path] }, React.createElement(AuthProvider, null, React.createElement(Sidebar))));
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

function className(markup) {
  return markup.match(/\bclass="([^"]+)"/)?.[1] || "";
}

function elementBySlot(html, slot) {
  const match = html.match(new RegExp(`<[^>]+data-slot="${slot}"[^>]*>`));
  assert.ok(match, `${slot} must be rendered`);
  return match[0];
}

function menuLink(html, path) {
  const match = html.match(new RegExp(`<a\\b[^>]*href="${path}"[^>]*>([\\s\\S]*?)</a>`));
  assert.ok(match, `${path} must remain a navigation link`);
  return match[0];
}

test("instructor navigation uses the wireframe's dashboard, file-pencil and file-arrow icons", async () => {
  const html = await renderSidebar();
  for (const [path, icon] of [["/dashboard", "layout-dashboard"], ["/instructor/class-records", "file-pen"], ["/instructor/class-requests", "file-input"], ["/settings", "settings"]]) {
    const link = menuLink(html, path);
    assert.match(link, new RegExp(`lucide-${icon}`));
    assert.match(link, /aria-hidden="true"/);
    assert.doesNotMatch(link, /\[&amp;_svg\]:size-5/);
  }
  assert.doesNotMatch(html, /lucide-clipboard-list|lucide-file-text/);
});

test("the settings gear remains outlined on normal and selected sidebar surfaces", async () => {
  for (const path of ["/instructor/class-requests", "/settings"]) {
    const gear = menuLink(await renderSidebar(path), "/settings");
    assert.match(gear, /lucide-settings/);
    assert.match(gear, /fill="none"/);
    assert.match(gear, /stroke-width="2.25"/);
    assert.doesNotMatch(gear, /fill="currentColor"|circle\]:fill-/);
  }
});

test("instructor navigation matches student icon, font and padding dimensions", async () => {
  const instructor = await renderSidebar("/instructor/class-requests");
  const student = await renderSidebar("/student/request", "/src/pages/auth/student/StudentSidebar.jsx");

  assert.equal(className(elementBySlot(instructor, "sidebar-content")), className(elementBySlot(student, "sidebar-content")));
  assert.equal(className(elementBySlot(instructor, "sidebar-menu")), className(elementBySlot(student, "sidebar-menu")));
  assert.equal(className(menuLink(instructor, "/settings")), className(menuLink(student, "/settings")));
  assert.match(menuLink(instructor, "/settings"), /stroke-width="2.25"/);
});

test("icon updates preserve nested-route selection, collapse controls and the logout trigger", async () => {
  const html = await renderSidebar("/instructor/class-records/class-one");
  assert.match(html, /aria-current="page"[^>]*href="\/instructor\/class-records"/);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
  assert.match(html, /aria-label="Toggle sidebar"/);
  assert.match(menuLink(html, "/instructor/class-records"), /bg-\[#203b82\]/);
  assert.match(html, /lucide-log-out/);
  assert.match(html, /Logout/);
  for (const label of ["Dashboard", "Class Records", "Class Requests", "Settings", "Logout"]) assert.ok(html.includes(`aria-label="${label}"`));
});
