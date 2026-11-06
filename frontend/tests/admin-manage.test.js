import { mockApiFetch } from "./helpers/mockApiFetch.js";
import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { MemoryRouter } from "react-router-dom";
import { getAdminAssignments, getAvailableAdminClasses, changeTeachingAssignment, assignClassInstructor } from "../src/api/adminAssignments.js";

const classes = [
  { id: "c1", program_id: "p1", subject_name: "Data Structures", section: "3A", instructor_id: "i1" },
  { id: "c2", program_id: "p1", subject_name: "Data Structures", section: "3B", instructor_id: "i1" },
  { id: "c3", program_id: "p2", subject_name: "Data Structures", section: "3A", instructor_id: "i2" },
];
const instructors = [
  { id: "i1", role: "instructor", status: "approved", name: "Ada" },
  { id: "i2", role: "instructor", status: "approved", name: "Grace", program_id: "general-education" },
  { id: "pending", role: "instructor", status: "pending" },
  { id: "inactive", role: "instructor", status: "deactivated" },
  { id: "head", role: "program_head", status: "approved" },
];

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true, value: { getItem: () => "mock-session", setItem() {}, removeItem() {} },
  });
  globalThis.window = new EventTarget();
  // Every request is mocked; an unexpected endpoint fails instead of reaching auth or production.
  mockApiFetch(async (url) => { throw new Error(`Unexpected request: ${url}`); });
});
afterEach(() => {
  mock.restoreAll();
  delete globalThis.localStorage;
  delete globalThis.window;
});

function mount(render) {
  const slots = [];
  let cursor = 0;
  let pending = [];
  let value;
  const same = (left, right) => left && right && left.length === right.length && left.every((item, index) => Object.is(item, right[index]));
  const dispatcher = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, next => { slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = initial === null
        ? { current: { open: false, showModal() { this.open = true; }, close() { this.open = false; } } }
        : { current: initial };
      return slots[index];
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
      return slots[index].value;
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
    effects.forEach(effect => effect());
    return value;
  }
  update();
  return {
    get value() { return value; },
    async flush() { await new Promise(resolve => setTimeout(resolve, 0)); update(); await new Promise(resolve => setTimeout(resolve, 0)); return update(); },
    html() { update(); return renderToStaticMarkup(value); },
    unmount() { slots.forEach(slot => slot.cleanup?.()); },
  };
}

function elements(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => elements(child, predicate));
  if (!React.isValidElement(node)) return [];
  return [...(predicate(node) ? [node] : []), ...elements(node.props.children, predicate)];
}

const elementById = (page, id) => elements(page.value, node => node.props.id === id)[0];
const formOf = page => elements(page.value, node => node.type === "form")[0];

async function withAssignmentDialog(run) {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
  try {
    const AssignmentDialog = (await server.ssrLoadModule("/src/pages/auth/admin/manage/AssignmentDialog.jsx")).default;
    await run(AssignmentDialog);
  } finally {
    await server.close();
  }
}

test("collection loading includes paginated classes, programs and approved role data", async () => {
  mockApiFetch(async (url) => {
    const request = new URL(url, "http://fixture.local");
    const page = Number(request.searchParams.get("page"));
    if (request.pathname === "/api/admin/programs") {
      assert.equal(request.searchParams.get("per_page"), "100");
      return Response.json({ data: [{ id: "p1", program_name: "BSIS" }], meta: { page, per_page: 100, total: 1, last_page: 1 } });
    }
    if (request.pathname === "/api/admin/users") {
      assert.equal(request.searchParams.get("per_page"), "100");
      assert.equal(request.searchParams.get("role"), "instructor");
      assert.equal(request.searchParams.get("status"), "approved");
      return Response.json({ data: instructors, meta: { page, per_page: 100, total: instructors.length, last_page: 1 } });
    }
    assert.equal(request.pathname, "/api/admin/classes");
    assert.equal(request.searchParams.get("per_page"), "25");
    // Use a full first page so pagination metadata and record counts agree.
    const firstPage = Array.from({ length: 25 }, (_, index) => ({ ...classes[0], id: `page1-${index}` }));
    return Response.json({ data: page === 1 ? firstPage : [classes[2]], meta: { page, per_page: 25, total: 26, last_page: 2 } });
  });
  const data = await getAdminAssignments();
  assert.equal(data.classes.length, 25);
  assert.equal(data.classes[0].id, "page1-0");
  assert.equal(data.classesMeta.last_page, 2);
  assert.deepEqual(data.programs.map(row => row.id), ["p1"]);
  assert.deepEqual(data.instructors.map(row => row.id), ["i1", "i2"]);
});

test("assignment choices load every existing API page and keep one option per class ID", async () => {
  const controller = new AbortController();
  mockApiFetch(async (url, options) => {
    const request = new URL(url, "http://fixture.local");
    const page = Number(request.searchParams.get("page"));
    assert.equal(request.pathname, "/api/admin/classes");
    assert.equal(request.searchParams.get("assignment_status"), null);
    assert.equal(request.searchParams.get("per_page"), "100");
    assert.equal(options.signal, controller.signal);
    const shared = { id: "class-a", program_id: "p1", subject_name: "Understanding the Self", section: "BSIS 1A", year_level: "1st", semester: "1st", school_year: "2026-2027", active_teaching_assignment: null };
    const other = { ...shared, id: "class-b", section: "BSIS 1B" };
    const assigned = { ...shared, id: "class-assigned", section: "BSIS 1C", instructor_id: "i1", active_teaching_assignment: { instructor_id: "i1" } };
    return Response.json({
      data: page === 1 ? [assigned, shared] : [shared, other],
      meta: { page, per_page: 100, total: 4, last_page: 2 },
    });
  });

  const available = await getAvailableAdminClasses({ signal: controller.signal });
  assert.deepEqual(available.map(row => row.id), ["class-assigned", "class-a", "class-b"]);
  assert.deepEqual(available.map(row => row.subject_name), ["Understanding the Self", "Understanding the Self", "Understanding the Self"]);
});

test("teaching assignment changes use the existing versioned backend action", async () => {
  mockApiFetch(async (url, options) => {
    assert.equal(url, "/api/admin/classes/source-id/assignment");
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), {
      action: "swap",
      expected_revision: 3,
      target_class_id: "target-id",
      target_expected_revision: 7,
      reason: "Changed assigned subject in Admin Manage.",
    });
    return Response.json({ success: true, data: { event_id: "event-one", classes: [{ id: "source-id" }, { id: "target-id" }] } });
  });

  const result = await changeTeachingAssignment("source-id", {
    action: "swap",
    expected_revision: 3,
    target_class_id: "target-id",
    target_expected_revision: 7,
    reason: "Changed assigned subject in Admin Manage.",
  });
  assert.equal(result.event_id, "event-one");
});

test("mounted dialog loads distinct class records and preserves review then confirm", async () => {
  const source = { ...classes[0], assignment_revision: 3, active_teaching_assignment: { instructor_id: "i1", instructor: instructors[0] }, semester: "1st", school_year: "2026-2027" };
  const targets = [
    { id: "class-a", program_id: "p1", subject_name: "Christian Teachings", section: "BSIS 1A", year_level: "1st", semester: "1st", school_year: "2026-2027", assignment_revision: 0, active_teaching_assignment: null },
    { id: "class-b", program_id: "p1", subject_name: "Organization and Management Concepts", section: "BSIS 1B", year_level: "1st", semester: "1st", school_year: "2026-2027", assignment_revision: 0, active_teaching_assignment: null },
  ];
  const onConflict = mock.fn(async () => [source, targets[0]]);
  const onSaved = mock.fn(async () => undefined);
  mockApiFetch(async (url, options = {}) => {
    const request = new URL(url, "http://fixture.local");
    if (options.method === "POST") {
      assert.equal(request.pathname, "/api/admin/classes/c1/assignment");
      assert.deepEqual(JSON.parse(options.body), {
        action: "change_subject",
        expected_revision: 3,
        target_class_id: "class-a",
        target_expected_revision: 0,
        reason: "Changed assigned subject in Admin Manage.",
      });
      return Response.json({ success: true, data: { event_id: "change-one", classes: [source, targets[0]] } });
    }
    return Response.json({ data: targets, meta: { page: 1, per_page: 100, total: 2, last_page: 1 } });
  });

  await withAssignmentDialog(async AssignmentDialog => {
    const page = mount(() => AssignmentDialog({
      row: source,
      data: { classes: [source], instructors: instructors.slice(0, 2), programs: [{ id: "p1", program_name: "BSIS" }] },
      onClose() {}, onConflict, onSaved,
    }));
    try {
      await page.flush();
      const loaded = page.html();
      assert.match(loaded, />Christian Teachings — BSIS 1A · 1st Year · 1st Semester · A\.Y\. 2026-2027<\/option>/);
      assert.match(loaded, />Organization and Management Concepts — BSIS 1B · 1st Year · 1st Semester · A\.Y\. 2026-2027<\/option>/);
      assert.equal((loaded.match(/value="class-a"/g) || []).length, 1);
      elementById(page, "assignment-class").props.onChange({ target: { value: "class-a" } });
      await page.flush();
      await formOf(page).props.onSubmit({ preventDefault() {} });
      await page.flush();
      assert.match(page.html(), /Before \/ After preview/);
      await formOf(page).props.onSubmit({ preventDefault() {} });
      await page.flush();
      assert.deepEqual(onConflict.mock.calls[0].arguments[0], ["c1", "class-a"]);
      assert.deepEqual(onSaved.mock.calls[0].arguments, [["c1", "class-a"], "Instructor subject updated."]);
    } finally {
      page.unmount();
    }
  });
});

test("mounted dialog aborts availability loading when it closes", async () => {
  let requestSignal;
  mockApiFetch((_url, options) => {
    requestSignal = options.signal;
    return new Promise((resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError"))));
  });

  await withAssignmentDialog(async AssignmentDialog => {
    const page = mount(() => AssignmentDialog({ row: classes[0], data: { classes, instructors, programs: [] }, onClose() {}, onConflict() {}, onSaved() {} }));
    await new Promise(resolve => setTimeout(resolve, 0));
    page.unmount();
    assert.equal(requestSignal.aborted, true);
  });
});

test("mounted dialog explains recovery after availability failure", async () => {
  mockApiFetch(async () => Response.json({ message: "Service unavailable." }, { status: 503 }));
  await withAssignmentDialog(async AssignmentDialog => {
    const page = mount(() => AssignmentDialog({ row: classes[0], data: { classes, instructors, programs: [] }, onClose() {}, onConflict() {}, onSaved() {} }));
    try {
      await page.flush();
      assert.match(page.html(), /Service unavailable\./);
      assert.match(page.html(), /close and reopen/i);
    } finally {
      page.unmount();
    }
  });
});

test("an assigned subject remains selectable and swaps the two instructors", async () => {
  const source = { ...classes[0], semester: "1st", school_year: "2026-2027", assignment_revision: 4, active_teaching_assignment: { instructor_id: "i1", instructor: instructors[0] } };
  const target = { id: "class-a", program_id: "p1", subject_name: "Christian Teachings", section: "BSIS 1A", year_level: "1st", semester: "1st", school_year: "2026-2027", assignment_revision: 8, instructor_id: "i2", active_teaching_assignment: { instructor_id: "i2", instructor: instructors[1] } };
  const onSaved = mock.fn(async () => undefined);
  mockApiFetch(async (url, options = {}) => {
    const request = new URL(url, "http://fixture.local");
    if (options.method === "POST") {
      assert.equal(request.pathname, "/api/admin/classes/c1/assignment");
      assert.deepEqual(JSON.parse(options.body), {
        action: "swap",
        expected_revision: 4,
        target_class_id: "class-a",
        target_expected_revision: 8,
        reason: "Changed assigned subject in Admin Manage.",
      });
      return Response.json({ success: true, data: { event_id: "swap-one", classes: [source, target] } });
    }
    return Response.json({ data: [target], meta: { page: 1, per_page: 100, total: 1, last_page: 1 } });
  });

  await withAssignmentDialog(async AssignmentDialog => {
    const page = mount(() => AssignmentDialog({
      row: source,
      data: { classes: [source], instructors: instructors.slice(0, 2), programs: [{ id: "p1", program_name: "BSIS" }] },
      onClose() {},
      onConflict: async () => [source, target],
      onSaved,
    }));
    try {
      await page.flush();
      elementById(page, "assignment-class").props.onChange({ target: { value: "class-a" } });
      await page.flush();
      await formOf(page).props.onSubmit({ preventDefault() {} });
      await page.flush();
      await formOf(page).props.onSubmit({ preventDefault() {} });
      await page.flush();
      assert.doesNotMatch(page.html(), /assignment changed while you were reviewing/i);
      assert.match(page.html(), /value="class-a"/);
      assert.deepEqual(onSaved.mock.calls[0].arguments, [["c1", "class-a"], "Instructor subject updated."]);
    } finally {
      page.unmount();
    }
  });
});

test("Assign Instructor still hides classes that already have an instructor", async () => {
  const unassigned = { id: "class-open", program_id: "p1", subject_name: "Christian Teachings", section: "BSIS 1A", year_level: "1st", semester: "1st", school_year: "2026-2027", assignment_revision: 0, active_teaching_assignment: null };
  const assigned = { ...unassigned, id: "class-occupied", subject_name: "Organization and Management Concepts", instructor_id: "i2", active_teaching_assignment: { instructor_id: "i2", instructor: instructors[1] } };
  mockApiFetch(async () => Response.json({ data: [assigned, unassigned], meta: { page: 1, per_page: 100, total: 2, last_page: 1 } }));

  await withAssignmentDialog(async AssignmentDialog => {
    const page = mount(() => AssignmentDialog({
      row: null,
      data: { classes: [], instructors: instructors.slice(0, 2), programs: [{ id: "p1", program_name: "BSIS" }] },
      onClose() {}, onConflict() {}, onSaved() {},
    }));
    try {
      await page.flush();
      const loaded = page.html();
      assert.match(loaded, /value="class-open"/);
      assert.doesNotMatch(loaded, /value="class-occupied"/);
    } finally {
      page.unmount();
    }
  });
});

test("Change Assigned Subject excludes destinations from another school year", async () => {
  const source = { ...classes[0], semester: "1st", school_year: "2026-2027", assignment_revision: 4, active_teaching_assignment: { instructor_id: "i1", instructor: instructors[0] } };
  const sameTerm = { id: "same-term", program_id: "p1", subject_name: "Christian Teachings", section: "BSIS 1A", year_level: "1st", semester: "1st", school_year: "2026-2027", assignment_revision: 0, active_teaching_assignment: null };
  const otherYear = { ...sameTerm, id: "other-year", section: "BSIS 1B", school_year: "2027-2028" };
  mockApiFetch(async () => Response.json({ data: [sameTerm, otherYear], meta: { page: 1, per_page: 100, total: 2, last_page: 1 } }));

  await withAssignmentDialog(async AssignmentDialog => {
    const page = mount(() => AssignmentDialog({
      row: source,
      data: { classes: [source], instructors: instructors.slice(0, 2), programs: [{ id: "p1", program_name: "BSIS" }] },
      onClose() {}, onConflict() {}, onSaved() {},
    }));
    try {
      await page.flush();
      const loaded = page.html();
      assert.match(loaded, /value="same-term"/);
      assert.doesNotMatch(loaded, /value="other-year"/);
    } finally {
      page.unmount();
    }
  });
});

test("mounted Assign Instructor sends the versioned assignment POST payload", async () => {
  const unassigned = { id: "class-open", program_id: "p1", subject_name: "Christian Teachings", section: "BSIS 1A", year_level: "1st", semester: "1st", school_year: "2026-2027", assignment_revision: 2, active_teaching_assignment: null };
  const onSaved = mock.fn(async () => undefined);
  let mutation;
  mockApiFetch(async (url, options = {}) => {
    if (options.method !== "GET") {
      mutation = { url, method: options.method, body: JSON.parse(options.body) };
      return options.method === "PATCH"
        ? Response.json({ success: true, data: { ...unassigned, instructor_id: "i2" } })
        : Response.json({ success: true, data: { event_id: "assign-one", classes: [{ ...unassigned, instructor_id: "i2" }] } });
    }
    return Response.json({ data: [unassigned], meta: { page: 1, per_page: 100, total: 1, last_page: 1 } });
  });

  await withAssignmentDialog(async AssignmentDialog => {
    const page = mount(() => AssignmentDialog({
      row: null,
      data: { classes: [], instructors: instructors.slice(0, 2), programs: [{ id: "p1", program_name: "BSIS" }] },
      onClose() {}, onConflict: async () => [unassigned], onSaved,
    }));
    try {
      await page.flush();
      elementById(page, "assignment-instructor").props.onChange({ target: { value: "i2" } });
      await page.flush();
      elementById(page, "assignment-class").props.onChange({ target: { value: "class-open" } });
      await page.flush();
      await formOf(page).props.onSubmit({ preventDefault() {} });
      await page.flush();
      assert.match(page.html(), /Before \/ After preview/);
      await formOf(page).props.onSubmit({ preventDefault() {} });
      await page.flush();
      assert.ok(mutation, page.html());
      assert.deepEqual(mutation, {
        url: "/api/admin/classes/class-open/assignment",
        method: "POST",
        body: {
          action: "assign",
          expected_revision: 2,
          instructor_id: "i2",
          reason: "Assigned instructor in Admin Manage.",
        },
      });
      assert.deepEqual(onSaved.mock.calls[0].arguments, [["class-open"], "Instructor assigned."]);
    } finally {
      page.unmount();
    }
  });
});

test("missing instructor cannot be sent as an unassignment", async () => {
  assert.throws(() => assignClassInstructor("c1", null), /instructor/i);
  for (const instructorId of ["", undefined]) {
    await assert.rejects(assignClassInstructor("c1", instructorId), /instructor/i);
  }
});

test("backend validation errors remain available to the dialog", async () => {
  mockApiFetch(async () => Response.json({
    message: "Validation failed.", errors: { instructor_id: ["The selected instructor is invalid."] },
  }, { status: 422 }));
  await assert.rejects(assignClassInstructor("c1", "i2"), error => {
    assert.equal(error.status, 422);
    assert.deepEqual(error.errors.instructor_id, ["The selected instructor is invalid."]);
    return true;
  });
});

test("an unsuccessful or malformed success response cannot be reported as saved", async () => {
  for (const payload of [null, { success: false, message: "Assignment rejected." }, { data: { id: "c1", instructor_id: "i1" } }]) {
    mockApiFetch(async () => Response.json(payload));
    await assert.rejects(assignClassInstructor("c1", "i2"), /confirm|rejected/i);
  }
});

test("collection requests forward cancellation", async () => {
  const controller = new AbortController();
  mockApiFetch(async (url, options) => {
    assert.equal(options.signal, controller.signal);
    return Response.json({ data: [] });
  });
  assert.deepEqual(await getAdminAssignments({ signal: controller.signal }), { classes: [], classesMeta: null, programs: [], instructors: [] });
});

test("collection failures reject loading without supplying fake assignments", async () => {
  mockApiFetch(async () => Response.json({ message: "Service unavailable." }, { status: 503 }));
  await assert.rejects(getAdminAssignments(), /Service unavailable/);
});

test("assignment dialog has 20px corners and class removal is enabled with destructive styling", async () => {
  const data = {
    classes: [{ ...classes[0], year_level: "3rd" }, ...classes.slice(1), { id: "ge-class", program_id: "ge", subject_name: "General Education Subject", section: "1A" }],
    instructors: instructors.slice(0, 2),
    programs: [{ id: "p1", program_name: "BSIS" }, { id: "p2", program_name: "BSA" }, { id: "ge", program_name: "General Education" }],
  };
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom", plugins: [{
    name: "loaded-assignments", enforce: "pre", transform(code, id) {
      if (id.replaceAll("\\", "/").endsWith("/src/pages/auth/admin/AdminManage.jsx")) {
        return code.replace("useState(cached?.data || null)", `useState(${JSON.stringify(data)})`).replace("useState(!cached)", "useState(false)");
      }
    },
  }] });
  try {
    const AssignmentDialog = (await server.ssrLoadModule("/src/pages/auth/admin/manage/AssignmentDialog.jsx")).default;
    const dialog = renderToStaticMarkup(React.createElement(AssignmentDialog, { row: classes[0], data }));
    assert.match(dialog, /<dialog\b[^>]*rounded-\[20px\]/);
    const createDialog = renderToStaticMarkup(React.createElement(AssignmentDialog, { row: null, data: { ...data, classes } }));
    assert.ok(createDialog.indexOf('id="assignment-instructor"') < createDialog.indexOf('id="assignment-program"'));
    assert.ok(createDialog.indexOf('id="assignment-program"') < createDialog.indexOf('id="assignment-class"'));
    assert.doesNotMatch(createDialog, /id="assignment-subject"/);
    assert.match(createDialog, /Loading available classes/);
    assert.match(createDialog, /Grace/);
    assert.match(dialog, /Data Structures — Section 3A/);
    const AdminManage = (await server.ssrLoadModule("/src/pages/auth/admin/AdminManage.jsx")).default;
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AdminManage)));
    const removeButtons = [...html.matchAll(/<button\b[^>]*>Remove<\/button>/g)];
    assert.equal(removeButtons.length, classes.length);
    for (const [remove] of removeButtons) {
      assert.match(remove, /bg-red-50/);
      assert.match(remove, /text-red-500/);
      assert.doesNotMatch(remove, /\sdisabled=""/);
    }
    assert.doesNotMatch(html, /unassignment-explanation|cannot be removed without a replacement/);
  } finally {
    await server.close();
  }
});

test("edit assignment loads its class selector independently without adding a subject dropdown", async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
  try {
    const AssignmentDialog = (await server.ssrLoadModule("/src/pages/auth/admin/manage/AssignmentDialog.jsx")).default;
    const data = {
      classes: [...classes, { id: "c4", program_id: "p2", subject_name: "Programming", section: "2A" }],
      instructors: instructors.slice(0, 2),
      programs: [{ id: "p1", program_name: "BSIS" }, { id: "p2", program_name: "BSA" }],
    };
    const dialog = renderToStaticMarkup(React.createElement(AssignmentDialog, { row: classes[0], data }));
    const program = dialog.match(/<select\b[^>]*id="assignment-program"[^>]*>/)?.[0] || "";
    const year = dialog.match(/<select\b[^>]*id="assignment-year"[^>]*>/)?.[0] || "";
    const semester = dialog.match(/<select\b[^>]*id="assignment-semester"[^>]*>/)?.[0] || "";
    const destination = dialog.match(/<select\b[^>]*id="assignment-class"[^>]*>/)?.[0] || "";
    assert.ok(program, "Program filter must render");
    assert.ok(year, "Year filter must render");
    assert.ok(semester, "Semester filter must render");
    assert.ok(destination, "Available Class dropdown must render");
    assert.doesNotMatch(dialog, /id="assignment-subject"/);
    assert.match(dialog, /<fieldset\b[^>]*disabled=""/);
    assert.match(dialog, /Loading available classes/);
    assert.doesNotMatch(dialog, /Programming — 2A/);
  } finally {
    await server.close();
  }
});

test("Manage announces its heading and loads with matching filter, action and table skeletons", async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
  try {
    const AdminManage = (await server.ssrLoadModule("/src/pages/auth/admin/AdminManage.jsx")).default;
    const html = renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(AdminManage)));
    assert.match(html, /<h1[^>]*>Manage<\/h1>/);
    assert.match(html, /aria-label="Loading instructor assignments"/);
    assert.match(html, /aria-busy="true"/);
    assert.equal((html.match(/data-slot="skeleton-row"/g) || []).length, 5);
    assert.match(html, /data-slot="skeleton"[^>]*w-\[260px\]/);
    assert.match(html, /data-slot="skeleton"[^>]*w-\[170px\]/);
    assert.doesNotMatch(html, /<(select|button)\b/);
    assert.doesNotMatch(html, /animate-spin/);
  } finally {
    await server.close();
  }
});
