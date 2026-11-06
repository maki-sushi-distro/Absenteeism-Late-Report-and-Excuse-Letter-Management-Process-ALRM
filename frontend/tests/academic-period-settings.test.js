import assert from "node:assert/strict";
import { after, afterEach, before, beforeEach, mock, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { mockApiFetch } from "./helpers/mockApiFetch.js";

let academicPeriod;
let AdminPolicyCard;
let cache;
let client;
let server;

const current = { semester: "1st", school_year: "2026-2027" };
const next = { semester: "2nd", school_year: "2026-2027" };

before(async () => {
  globalThis.window = new EventTarget();
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
  academicPeriod = await server.ssrLoadModule("/src/api/academicPeriod.js");
  ({ AdminPolicyCard } = await server.ssrLoadModule("/src/pages/auth/Settings.jsx"));
  cache = await server.ssrLoadModule("/src/api/resourceCache.js");
  client = await server.ssrLoadModule("/src/api/client.js");
});

beforeEach(() => {
  cache.clearResourceCache();
  client.resetCsrfToken();
});

afterEach(() => mock.restoreAll());
after(async () => {
  await server?.close();
  delete globalThis.window;
});

function mount(render) {
  const slots = [];
  let cursor = 0;
  let pending = [];
  let value;
  const same = (left, right) => left?.length === right?.length && left.every((item, index) => Object.is(item, right[index]));
  const dispatcher = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, (nextValue) => {
        slots[index].value = typeof nextValue === "function" ? nextValue(slots[index].value) : nextValue;
        update();
      }];
    },
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
    effects.forEach((effect) => effect());
    return value;
  }
  update();
  return {
    get value() { return value; },
    async flush() {
      await new Promise((resolve) => setTimeout(resolve, 0));
      update();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return update();
    },
    html() { update(); return renderToStaticMarkup(value); },
    unmount() { slots.forEach((slot) => slot.cleanup?.()); },
  };
}

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

const elementById = (page, id) => elements(page.value, (node) => node.props.id === id)[0];
const formOf = (page) => elements(page.value, (node) => node.type === "form")[0];
const submitButtonOf = (page) => elements(page.value, (node) => node.props.type === "submit")[0];
const editButtonOf = (page) => elements(page.value, (node) => node.props.type === "button" && node.props.children === "Edit academic period")[0];
const academicPeriodActionLabels = (page) => elements(page.value, (node) =>
  ["Save academic period", "Edit academic period"].includes(node.props.children))
  .map((node) => node.props.children);

test("academic period API loads the current backend-owned period", async () => {
  const endpoint = mockApiFetch(async (url, options) => {
    assert.equal(url, "/api/academic-period");
    assert.equal(options.method, "GET");
    return Response.json({ success: true, data: current });
  });

  assert.deepEqual(await academicPeriod.getAcademicPeriod(), current);
  assert.equal(endpoint.mock.callCount(), 1);
});

test("confirmed academic period update normalizes the payload and clears cached resources", async () => {
  await cache.requestCachedResource("student:dashboard:one", async () => ({ total_classes: 1 }));
  const endpoint = mockApiFetch(async (url, options) => {
    assert.equal(url, "/api/admin/academic-period");
    assert.equal(options.method, "PUT");
    assert.deepEqual(JSON.parse(options.body), next);
    return Response.json({ success: true, data: next });
  });

  assert.deepEqual(await academicPeriod.updateAcademicPeriod({ ...next, school_year: " 2026-2027 " }), next);
  assert.equal(endpoint.mock.callCount(), 1);
  assert.deepEqual(cache.resourceCacheSnapshot(), { entries: 0, inFlight: 0 });
});

test("unconfirmed academic period update preserves cached resources", async () => {
  await cache.requestCachedResource("admin:dashboard", async () => ({ total_classes: 1 }));
  mockApiFetch(async () => Response.json({ success: true, data: current }));

  await assert.rejects(
    academicPeriod.updateAcademicPeriod(next),
    /server did not confirm the academic period update/i,
  );
  assert.deepEqual(cache.resourceCacheSnapshot(), { entries: 1, inFlight: 0 });
});

test("academic period helpers compare normalized values and surface useful feedback", () => {
  assert.equal(academicPeriod.academicPeriodsMatch(
    { ...current, school_year: " 2026-2027 " },
    current,
  ), true);
  assert.equal(academicPeriod.academicPeriodsMatch(current, next), false);
  assert.equal(academicPeriod.academicPeriodLabel(next), "2nd Semester · A.Y. 2026-2027");
  assert.equal(academicPeriod.academicPeriodError({
    message: "The given data was invalid.",
    errors: { school_year: ["The school year must contain consecutive years."] },
  }), "The school year must contain consecutive years.");
});

test("academic period form saves a changed period and promotes the confirmed value", async () => {
  const endpoint = mockApiFetch(async (url, options) => {
    if (url === "/api/academic-period") return Response.json({ success: true, data: current });
    assert.equal(url, "/api/admin/academic-period");
    assert.deepEqual(JSON.parse(options.body), next);
    return Response.json({ success: true, data: next });
  });
  const page = mount(() => AdminPolicyCard());

  try {
    await page.flush();
    assert.match(page.html(), /Current active period: 1st Semester · A\.Y\. 2026-2027/);
    assert.equal(elementById(page, "academic-semester").props.disabled, true);
    assert.equal(submitButtonOf(page).props.disabled, true);
    assert.ok(editButtonOf(page));
    assert.deepEqual(academicPeriodActionLabels(page), ["Save academic period", "Edit academic period"]);

    editButtonOf(page).props.onClick();
    await page.flush();
    assert.equal(elementById(page, "academic-semester").props.disabled, false);
    assert.equal(submitButtonOf(page).props.disabled, true);

    elementById(page, "academic-semester").props.onChange({ target: { value: "2nd" } });
    await page.flush();
    assert.match(page.html(), /Unsaved changes/);
    assert.equal(submitButtonOf(page).props.disabled, false);

    await formOf(page).props.onSubmit({ preventDefault() {} });
    await page.flush();
    assert.match(page.html(), /Academic period saved\./);
    assert.match(page.html(), /Current active period: 2nd Semester · A\.Y\. 2026-2027/);
    assert.doesNotMatch(page.html(), /Unsaved changes/);
    assert.equal(elementById(page, "academic-semester").props.disabled, true);
    assert.equal(submitButtonOf(page).props.disabled, true);
    assert.ok(editButtonOf(page));
    assert.equal(endpoint.mock.callCount(), 2);
  } finally {
    page.unmount();
  }
});

test("academic period form keeps unsaved edits when the backend rejects the update", async () => {
  mockApiFetch(async (url) => url === "/api/academic-period"
    ? Response.json({ success: true, data: current })
    : Response.json({
      success: false,
      message: "The given data was invalid.",
      errors: { school_year: ["That academic period already exists."] },
    }, { status: 422 }));
  const page = mount(() => AdminPolicyCard());

  try {
    await page.flush();
    editButtonOf(page).props.onClick();
    await page.flush();
    elementById(page, "academic-semester").props.onChange({ target: { value: "2nd" } });
    await page.flush();
    await formOf(page).props.onSubmit({ preventDefault() {} });
    await page.flush();

    assert.match(page.html(), /That academic period already exists\./);
    assert.match(page.html(), /Unsaved changes/);
    assert.equal(elementById(page, "academic-semester").props.value, "2nd");
    assert.equal(elementById(page, "academic-semester").props.disabled, false);
    assert.equal(submitButtonOf(page).props.disabled, false);
  } finally {
    page.unmount();
  }
});

test("academic period form stays locked when the current period cannot load", async () => {
  mockApiFetch(async () => Response.json({
    success: false,
    message: "Could not load period.",
  }, { status: 503 }));

  const page = mount(() => AdminPolicyCard());

  try {
    await page.flush();
    assert.match(page.html(), /Could not load period\./);
    assert.equal(elementById(page, "academic-semester").props.disabled, true);
    assert.equal(editButtonOf(page).props.disabled, true);
    assert.equal(submitButtonOf(page).props.disabled, true);
  } finally {
    page.unmount();
  }
});
