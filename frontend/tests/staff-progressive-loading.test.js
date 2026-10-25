import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";

let server;
let AuthProvider;
const originalWindow = globalThis.window;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
const originalFetch = globalThis.fetch;
before(async () => {
  globalThis.window = { setTimeout, clearTimeout, localStorage: { getItem: () => null } };
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: window.localStorage });
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
  ({ AuthProvider } = await server.ssrLoadModule("/src/context/AuthContext.jsx"));
});
after(async () => {
  await server?.close();
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete globalThis.localStorage;
});

// Exercise real hook/effect code without adding a DOM or renderer dependency.
function mount(render) {
  const slots = [];
  let cursor = 0;
  let pending = [];
  let value;
  let updates = 0;
  const same = (a, b) => a && b && a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
  const dispatcher = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, next => { updates++; slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useCallback(callback, deps) { return dispatcher.useMemo(() => callback, deps); },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) {
        const previous = slots[index];
        slots[index] = { deps };
        pending.push(() => { previous?.cleanup?.(); slots[index].cleanup = effect(); });
      }
    },
  };
  function update() {
    cursor = 0;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const previous = internals.H;
    internals.H = dispatcher;
    try { value = render(); } finally { internals.H = previous; }
    const effects = pending;
    pending = [];
    effects.forEach(effect => effect());
    return value;
  }
  update();
  return {
    get value() { return value; },
    get updates() { return updates; },
    async flush() { await new Promise(resolve => setTimeout(resolve, 0)); update(); await new Promise(resolve => setTimeout(resolve, 0)); return update(); },
    html() { update(); return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AuthProvider, null, value))); },
    unmount() { slots.forEach(slot => slot.cleanup?.()); },
  };
}

function network() {
  const calls = [];
  globalThis.fetch = (input, options = {}) => new Promise(resolve => {
    const path = new URL(input, "http://localhost").pathname;
    calls.push({ path, options, resolve });
  });
  return {
    calls,
    reply(path, data, status = 200) {
      const call = calls.find(call => call.path === `/api/${path}` && !call.done);
      assert.ok(call, `Expected pending request for ${path}`);
      call.done = true;
      call.resolve(Response.json(status === 200 ? { data } : { message: data }, { status }));
    },
  };
}

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}
const button = (page, text) => elements(page.value, node => node.props.children === text)[0];
const phData = { total_classes: 7, total_students: 123, program_name: "Information Systems" };
const adminData = { total_programs: 9, total_classes: 12, total_students: 123, total_instructors: 4, total_program_heads: 2, pending_requests: 3, warning_count: 1, ir_count: 0 };
const flags = [{ id: "flag-one", status: "open", request: { enrollment: { student: { id: "student-one", name: "Test Student" } } } }];
const users = [{ id: "instructor-one", name: "Test Instructor", email: "test@example.test", role: "instructor", status: "active" }];
const programs = [{ id: "program-one", program_name: "Test Program" }];
const classes = [{ id: "class-one", subject_name: "Test Subject" }];
const phPath = "/src/pages/auth/programHead/ProgramHeadDashboard.jsx";
const adminPath = "/src/pages/auth/admin/AdminDashboard.jsx";

test("program head publishes dashboard, requests and flags independently with one loading status", async () => {
  const { ProgramHeadDashboard } = await server.ssrLoadModule(phPath);
  const api = network();
  const page = mount(() => ProgramHeadDashboard({}));
  try {
    let html = page.html();
    assert.match(html, /data-slot="dashboard-skeleton"/);
    assert.match(html, /data-variant="program"/);
    assert.match(html, /aria-busy="true"/);
    assert.equal((html.match(/role="status"/g) || []).length, 1);
    await page.flush();
    api.reply("program-head/dashboard", phData);
    await page.flush();
    html = page.html();
    assert.match(html, />123</);
    assert.match(html, /activity-chart-placeholder/);
    assert.doesNotMatch(html, /No escalated students/);
    api.reply("program-head/requests", []);
    await page.flush();
    html = page.html();
    assert.match(html, /Absences and tardiness/);
    assert.doesNotMatch(html, /activity-chart-placeholder/);
    assert.equal((html.match(/role="status"/g) || []).length, 1);
    api.reply("program-head/students/flagged", flags);
    await page.flush();
    assert.match(page.html(), /Test Student/);
    assert.doesNotMatch(page.html(), /role="status"/);
  } finally { page.unmount(); }
});

test("program request failures stay local, retry keeps resolved widgets and unmount blocks late updates", async () => {
  const { ProgramHeadDashboard } = await server.ssrLoadModule(phPath);
  const api = network();
  const page = mount(() => ProgramHeadDashboard({}));
  try {
    await page.flush();
    api.reply("program-head/dashboard", phData);
    api.reply("program-head/students/flagged", flags);
    api.reply("program-head/requests", "Requests offline", 503);
    await page.flush();
    assert.match(page.html(), /Requests offline/);
    assert.match(page.html(), /Test Student/);
    assert.doesNotMatch(page.html(), /Absences and tardiness/);
    button(page, "Retry loading").props.onClick();
    await page.flush();
    assert.match(page.html(), /Test Student/);
    assert.match(page.html(), />123</);
    api.reply("program-head/requests", []);
    await page.flush();
    assert.match(page.html(), /Absences and tardiness/);
    page.unmount();
    const count = page.updates;
    api.reply("program-head/dashboard", { total_students: 999 });
    await page.flush();
    assert.equal(page.updates, count);
  } finally { page.unmount(); }
});

test("program refresh rejects superseded responses and non-dashboard views ignore unrelated loading", async () => {
  const { useProgramHeadRecords } = await server.ssrLoadModule("/src/pages/auth/programHead/useProgramHeadRecords.js");
  const api = network();
  const hook = mount(() => useProgramHeadRecords());
  try {
    await hook.flush();
    hook.value.refresh();
    await hook.flush();
    api.reply("program-head/dashboard", { total_students: 999 });
    await hook.flush();
    assert.notEqual(hook.value.dashboard?.total_students, 999);
    api.reply("program-head/dashboard", phData);
    await hook.flush();
    assert.equal(hook.value.dashboard.total_students, 123);
    assert.equal(hook.value.resourceLoading.dashboard, false);
    assert.equal(hook.value.resourceLoading.requests, true);
  } finally { hook.unmount(); }
  const { ProgramHeadDashboard } = await server.ssrLoadModule(phPath);
  const only = network();
  const page = mount(() => ProgramHeadDashboard({ view: "flagged" }));
  try {
    await page.flush();
    only.reply("program-head/students/flagged", []);
    await page.flush();
    assert.doesNotMatch(page.html(), /role="status"/);
    assert.match(page.html(), /No/);
  } finally { page.unmount(); }
});

test("admin widgets reveal independently and create actions wait for their option resources", async () => {
  const { AdminDashboard } = await server.ssrLoadModule(adminPath);
  const api = network();
  const page = mount(() => AdminDashboard({}));
  try {
    const initial = page.html();
    assert.match(initial, /data-slot="dashboard-skeleton"/);
    assert.match(initial, /data-variant="admin"/);
    assert.match(initial, /aria-busy="true"/);
    assert.equal((initial.match(/role="status"/g) || []).length, 1);
    await page.flush();
    api.reply("admin/dashboard", adminData);
    await page.flush();
    assert.match(page.html(), />123</);
    api.reply("admin/classes", classes);
    api.reply("admin/programs", programs);
    await page.flush();
    assert.match(page.html(), /Test Subject/);
    assert.match(page.html(), /Test Program/);
    assert.equal(button(page, "Create").props.disabled, true);
    assert.equal(button(page, "Create class").props.disabled, true);
    const createForm = elements(page.value, node => node.type === "form" && elements(node, child => child.props.children === "Create").length)[0];
    await createForm.props.onSubmit({ preventDefault() {} });
    assert.equal(api.calls.filter(call => call.options.method === "POST").length, 0);
    api.reply("admin/users", users);
    await page.flush();
    assert.match(page.html(), /Test Instructor/);
    assert.equal(button(page, "Create").props.disabled, false);
    assert.equal(button(page, "Create class").props.disabled, false);
    assert.doesNotMatch(page.html(), /role="status"/);
  } finally { page.unmount(); }
});

test("admin local failures do not fabricate metric zeros or empty lists and retry recovers", async () => {
  const { AdminDashboard } = await server.ssrLoadModule(adminPath);
  const api = network();
  const page = mount(() => AdminDashboard({}));
  try {
    await page.flush();
    api.reply("admin/dashboard", "Metrics offline", 503);
    api.reply("admin/users", "Users offline", 503);
    api.reply("admin/programs", programs);
    api.reply("admin/classes", classes);
    await page.flush();
    const html = page.html();
    assert.match(html, /Metrics offline/);
    assert.match(html, /Users offline/);
    assert.match(html, /Test Program/);
    assert.doesNotMatch(html, /No staff accounts|>0<|No classes found/);
    assert.equal(button(page, "Create").props.disabled, true);
    assert.equal(button(page, "Create class").props.disabled, true);
    const retry = elements(page.value, node => node.props.children === "Retry loading")[0];
    retry.props.onClick();
    await page.flush();
    assert.match(page.html(), /Test Program/);
    api.reply("admin/dashboard", adminData);
    api.reply("admin/users", users);
    await page.flush();
    assert.match(page.html(), />123</);
    assert.match(page.html(), /Test Instructor/);
  } finally { page.unmount(); }
});

test("admin users view and role mutation reload do not wait to publish unrelated widgets", async () => {
  const { AdminDashboard } = await server.ssrLoadModule(adminPath);
  const api = network();
  const page = mount(() => AdminDashboard({ view: "users" }));
  try {
    await page.flush();
    api.reply("admin/users", users);
    await page.flush();
    assert.match(page.html(), /Test Instructor/);
    assert.doesNotMatch(page.html(), /role="status"/);
    const select = elements(page.value, node => node.type === "select")[0];
    select.props.onChange({ target: { value: "program_head" } });
    await page.flush();
    button(page, "Assign role").props.onClick();
    api.reply("admin/users/instructor-one/role", { ...users[0], role: "program_head" });
    await page.flush();
    assert.equal(api.calls.filter(call => call.path === "/api/admin/users").length, 2);
    assert.match(page.html(), /Test Instructor/);
    api.reply("admin/users", [{ ...users[0], role: "program_head" }]);
    await page.flush();
    assert.match(page.html(), /Staff role assigned/);
    page.unmount();
    const count = page.updates;
    api.reply("admin/dashboard", adminData);
    await page.flush();
    assert.equal(page.updates, count);
  } finally { page.unmount(); }
});

test("program flag failure leaves the request chart usable without claiming no students are at risk", async () => {
  const { ProgramHeadDashboard } = await server.ssrLoadModule(phPath);
  const api = network();
  const page = mount(() => ProgramHeadDashboard({}));
  try {
    await page.flush();
    api.reply("program-head/requests", []);
    api.reply("program-head/students/flagged", "Flags offline", 503);
    await page.flush();
    const html = page.html();
    assert.match(html, /Absences and tardiness/);
    assert.match(html, /Flags offline/);
    assert.doesNotMatch(html, /No escalated students|>0</);
    assert.match(html, /metric-placeholder/);
  } finally { page.unmount(); }
});

test("admin superseded responses cannot overwrite a newer reload", async () => {
  const { AdminDashboard } = await server.ssrLoadModule(adminPath);
  const api = network();
  const page = mount(() => AdminDashboard({}));
  try {
    await page.flush();
    api.reply("admin/users", "Users offline", 503);
    await page.flush();
    button(page, "Retry loading").props.onClick();
    await page.flush();
    api.reply("admin/dashboard", { total_students: 999 });
    await page.flush();
    assert.doesNotMatch(page.html(), />999</);
    api.reply("admin/dashboard", adminData);
    await page.flush();
    assert.match(page.html(), />123</);
    assert.match(page.html(), /metric-placeholder|data-slot="skeleton"/);
  } finally { page.unmount(); }
});

test("admin program failure leaves classes visible and report options recover without dashboard data", async () => {
  const { AdminDashboard } = await server.ssrLoadModule(adminPath);
  const api = network();
  const page = mount(() => AdminDashboard({ view: "classes" }));
  try {
    await page.flush();
    api.reply("admin/users", users);
    api.reply("admin/classes", classes);
    api.reply("admin/programs", "Programs offline", 503);
    await page.flush();
    const html = page.html();
    assert.match(html, /Test Subject/);
    assert.match(html, /Programs offline/);
    assert.equal(button(page, "Create class").props.disabled, true);
    assert.doesNotMatch(html, /role="status"/);
  } finally { page.unmount(); }

  const reportApi = network();
  const report = mount(() => AdminDashboard({ view: "reports" }));
  try {
    await report.flush();
    reportApi.reply("admin/programs", programs);
    await report.flush();
    assert.match(report.html(), /Export requests report/);
    assert.doesNotMatch(report.html(), /role="status"/);
    assert.equal(button(report, "Download").props.disabled, false);
  } finally { report.unmount(); }
});

test("administrator create and delete mutations retain their payloads and await all reload resources", async () => {
  const { AdminDashboard } = await server.ssrLoadModule(adminPath);
  const api = network();
  const page = mount(() => AdminDashboard({}));
  const settle = async () => {
    api.reply("admin/dashboard", adminData);
    api.reply("admin/users", users);
    api.reply("admin/programs", programs);
    api.reply("admin/classes", classes);
    await page.flush();
  };
  const fill = (name, value) => {
    const field = elements(page.value, node => node.props.name === name)[0];
    field.props.onChange({ target: { name, value } });
  };
  try {
    await page.flush();
    await settle();
    fill("program_name", "New Program");
    fill("program_head_id", "instructor-one");
    await page.flush();
    const form = elements(page.value, node => node.type === "form")[0];
    const action = form.props.onSubmit({ preventDefault() {} });
    const create = api.calls.find(call => call.options.method === "POST");
    assert.deepEqual(JSON.parse(create.options.body), { program_name: "New Program", program_head_id: "instructor-one" });
    api.reply("admin/programs", programs[0]);
    await page.flush();
    assert.equal(button(page, "Create").props.disabled, true);
    api.reply("admin/users", users);
    await page.flush();
    // Working state survives partial reload completion.
    assert.equal(button(page, "Create").props.disabled, true);
    api.reply("admin/dashboard", adminData);
    api.reply("admin/programs", programs);
    api.reply("admin/classes", classes);
    await action;
    await page.flush();
    assert.equal(elements(page.value, node => node.props.name === "program_name")[0].props.value, "");

    for (const [name, value] of Object.entries({ subject_name: "New Subject", section: "A", schedule: "Monday", instructor_id: "instructor-one", program_id: "program-one", school_year: "2026-2027" })) fill(name, value);
    await page.flush();
    const classAction = elements(page.value, node => node.type === "form")[1].props.onSubmit({ preventDefault() {} });
    const createClass = api.calls.find(call => call.path === "/api/admin/classes" && call.options.method === "POST");
    assert.deepEqual(JSON.parse(createClass.options.body), { subject_name: "New Subject", section: "A", schedule: "Monday", instructor_id: "instructor-one", program_id: "program-one", semester: "1st", school_year: "2026-2027" });
    api.reply("admin/classes", classes[0]);
    await page.flush();
    await settle();
    await classAction;
    await page.flush();
    assert.equal(elements(page.value, node => node.props.name === "subject_name")[0].props.value, "");

    for (const path of ["admin/programs/program-one", "admin/classes/class-one"]) {
      const buttons = elements(page.value, node => node.props.children === "Delete");
      buttons[path.includes("/programs/") ? 0 : 1].props.onClick();
      const deletion = api.calls.find(call => call.path === `/api/${path}`);
      assert.equal(deletion.options.method, "DELETE");
      api.reply(path, {});
      await page.flush();
      await settle();
    }
    assert.match(page.html(), /Class deleted/);
  } finally { page.unmount(); }
});
