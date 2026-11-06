import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

let server, Chart;
before(async () => {
  server = await createServer({
    server: { middlewareMode: true, ws: false }, appType: "custom",
    plugins: [{ name: "weekly-report-fixture", enforce: "pre", load(id) {
      if (id.replaceAll("\\", "/").endsWith("/src/api/adminReports.js")) {
        return "export const generateAdminReport = (...args) => globalThis.weeklyReportFixture(...args);";
      }
    } }],
  });
  Chart = (await server.ssrLoadModule("/src/pages/auth/admin/dashboard/AdminDepartmentChart.jsx")).default;
});
after(async () => { await server?.close(); });

// Same lightweight React dispatcher approach as the existing Admin Manage tests.
function mount(render) {
  const slots = [];
  let cursor, pending = [], value;
  const dispatcher = {
    useState(initial) {
      const index = cursor++;
      slots[index] ??= { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, next => { slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }];
    },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((item, i) => !Object.is(item, slots[index].deps[i]))) {
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
  }
  update();
  return {
    get value() { return value; },
    async flush() { update(); await new Promise(resolve => setTimeout(resolve, 0)); update(); },
    html() { return renderToStaticMarkup(value); },
    unmount() { slots.forEach(slot => slot.cleanup?.()); },
  };
}
function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}
const button = (page, label) => elements(page.value, node => node.type === "button" && node.props.children === label)[0];

test("weekly chart refreshes, retains data on failure, cancels stale weeks and cleans up visible-page refreshes", async () => {
  const originalWindow = globalThis.window, originalDocument = globalThis.document;
  const calls = [], listeners = new Set();
  let tick, cleared = false;
  const win = new EventTarget(), doc = new EventTarget();
  win.setTimeout = setTimeout;
  win.clearTimeout = clearTimeout;
  win.setInterval = callback => { tick = callback; return 1; };
  win.clearInterval = () => { cleared = true; };
  doc.hidden = false;
  for (const target of [win, doc]) {
    const add = target.addEventListener.bind(target), remove = target.removeEventListener.bind(target);
    target.addEventListener = (type, callback) => { listeners.add(callback); add(type, callback); };
    target.removeEventListener = (type, callback) => { remove(type, callback); listeners.delete(callback); };
  }
  globalThis.window = win;
  globalThis.document = doc;
  globalThis.weeklyReportFixture = (week, { signal }) => new Promise((resolve, reject) => calls.push({ week, signal, resolve, reject }));
  const page = mount(() => Chart({ programs: [{ program_name: "BSIS" }] }));
  const reply = (index, count = 1) => calls[index].resolve({ rows: Array.from({ length: count }, (_, i) => ({ "Request ID": `late-${i}`, Program: "BSIS", Type: "late", "Start Date": calls[index].week.date_from })) });
  try {
    await page.flush();
    assert.equal(calls.length, 1);
    reply(0);
    await page.flush();
    assert.match(page.html(), /0 absence reports; 1 late reports/);
    assert.doesNotMatch(page.html(), /No absence or late reports/);
    button(page, "Refresh").props.onClick();
    await page.flush();
    assert.equal(calls.length, 2);
    assert.match(page.html(), /1 late reports/);
    calls[1].reject(new Error("Report service unavailable"));
    await page.flush();
    assert.match(page.html(), /Showing previously loaded totals/);
    assert.match(page.html(), /1 late reports/);
    button(page, "Retry weekly reports").props.onClick();
    await page.flush();
    button(page, "Last week").props.onClick();
    await page.flush();
    assert.equal(calls[2].signal.aborted, true);
    reply(3, 2);
    await page.flush();
    reply(2, 99);
    await page.flush();
    assert.match(page.html(), /2 late reports/);
    assert.doesNotMatch(page.html(), /99 late reports/);
    button(page, "This week").props.onClick();
    await page.flush();
    assert.equal(calls.length, 5, "cached weeks must still revalidate");
    reply(4);
    await page.flush();
    doc.hidden = true;
    tick();
    await page.flush();
    assert.equal(calls.length, 5);
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    await page.flush();
    assert.equal(calls.length, 6);
    win.dispatchEvent(new Event("focus"));
    await page.flush();
    assert.equal(calls.length, 7);
    tick();
    await page.flush();
    assert.equal(calls.length, 8);
  } finally {
    page.unmount();
    assert.equal(calls.at(-1).signal.aborted, true);
    assert.equal(cleared, true);
    assert.equal(listeners.size, 0);
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
    delete globalThis.weeklyReportFixture;
  }
});
