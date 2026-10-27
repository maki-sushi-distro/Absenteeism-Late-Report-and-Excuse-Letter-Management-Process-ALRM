import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { MemoryRouter } from "react-router-dom";
import { getAdminAssignments, assignClassInstructor } from "../src/api/adminAssignments.js";
import {
  assignmentSelection, changeAssignmentSelection, selectedAssignmentClass, validateAssignment,
} from "../src/pages/auth/admin/manage/assignments.js";

const classes = [
  { id: "c1", program_id: "p1", subject_name: "Data Structures", section: "3A", instructor_id: "i1" },
  { id: "c2", program_id: "p1", subject_name: "Data Structures", section: "3B", instructor_id: "i1" },
  { id: "c3", program_id: "p2", subject_name: "Data Structures", section: "3A", instructor_id: "i2" },
];
const instructors = [
  { id: "i1", role: "instructor", status: "approved", name: "Ada" },
  { id: "i2", role: "instructor", status: "approved", name: "Grace" },
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
  mock.method(globalThis, "fetch", async (url) => { throw new Error(`Unexpected request: ${url}`); });
});
afterEach(() => {
  mock.restoreAll();
  delete globalThis.localStorage;
  delete globalThis.window;
});

test("Edit starts from the actual class and its approved instructor", () => {
  assert.deepEqual(assignmentSelection(classes[1], instructors), {
    programId: "p1", subject: "Data Structures", classId: "c2", instructorId: "i1",
  });
  assert.equal(assignmentSelection({ ...classes[0], instructor_id: "pending" }, instructors).instructorId, "");
});

test("changing program clears all dependent choices and stale class IDs", () => {
  const next = changeAssignmentSelection(assignmentSelection(classes[0], instructors), "programId", "p2");
  assert.deepEqual(next, { programId: "p2", subject: "", classId: "", instructorId: "" });
  assert.equal(selectedAssignmentClass(classes, next), undefined);
});

test("changing subject and section clears dependent selections", () => {
  const initial = assignmentSelection(classes[0], instructors);
  assert.deepEqual(changeAssignmentSelection(initial, "subject", "Programming"), {
    ...initial, subject: "Programming", classId: "", instructorId: "",
  });
  assert.deepEqual(changeAssignmentSelection(initial, "classId", "c2"), {
    ...initial, classId: "c2", instructorId: "",
  });
});

test("class selection cannot cross a selected program or subject", () => {
  const initial = assignmentSelection(classes[0], instructors);
  assert.equal(selectedAssignmentClass(classes, { ...initial, programId: "p2" }), undefined);
  assert.equal(selectedAssignmentClass(classes, { ...initial, subject: "Other subject" }), undefined);
  assert.throws(() => validateAssignment(classes, instructors, { ...initial, classId: "missing" }), /existing class/i);
});

test("assignment validates instructor role and approval before sending", () => {
  const initial = assignmentSelection(classes[0], instructors);
  for (const instructorId of ["", "missing", "pending", "inactive", "head"]) {
    assert.throws(() => validateAssignment(classes, instructors, { ...initial, instructorId }), /approved instructor/i);
  }
  assert.deepEqual(validateAssignment(classes, instructors, { ...initial, instructorId: "i2" }), {
    classId: "c1", instructorId: "i2",
  });
});

test("the same section in a different class or term resolves by actual class ID", () => {
  const duplicate = { ...classes[0], id: "c4", school_year: "2027-2028" };
  const selected = { ...assignmentSelection(classes[0], instructors), classId: "c4", instructorId: "i2" };
  assert.equal(validateAssignment([...classes, duplicate], instructors, selected).classId, "c4");
});

test("collection loading includes paginated classes, programs and approved role data", async () => {
  mock.method(globalThis, "fetch", async (url) => {
    const request = new URL(url, "http://fixture.local");
    const page = Number(request.searchParams.get("page"));
    assert.equal(request.searchParams.get("per_page"), "100");
    const meta = { page, per_page: 100, total: 1, last_page: 1 };
    if (request.pathname === "/api/admin/programs") return Response.json({ data: [{ id: "p1", program_name: "BSIS" }], meta });
    if (request.pathname === "/api/admin/users") {
      assert.equal(request.searchParams.get("role"), "instructor");
      assert.equal(request.searchParams.get("status"), "approved");
      return Response.json({ data: instructors, meta: { ...meta, total: instructors.length } });
    }
    assert.equal(request.pathname, "/api/admin/classes");
    // Use a full first page so pagination metadata and record counts agree.
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ ...classes[0], id: `page1-${index}` }));
    return Response.json({ data: page === 1 ? firstPage : [classes[2]], meta: { ...meta, total: 101, last_page: 2 } });
  });
  const data = await getAdminAssignments();
  assert.equal(data.classes.length, 101);
  assert.equal(data.classes[100].id, "c3");
  assert.deepEqual(data.programs.map(row => row.id), ["p1"]);
  assert.deepEqual(data.instructors.map(row => row.id), ["i1", "i2"]);
});

test("assignment PATCH sends only instructor_id and waits for the server response", async () => {
  let respond;
  mock.method(globalThis, "fetch", (url, options) => {
    assert.equal(url, "/api/admin/classes/class%2Fid");
    assert.equal(options.method, "PATCH");
    assert.deepEqual(JSON.parse(options.body), { instructor_id: "i2" });
    return new Promise(resolve => { respond = resolve; });
  });
  let completed = false;
  const saving = assignClassInstructor("class/id", "i2").then(data => { completed = true; return data; });
  await Promise.resolve();
  assert.equal(completed, false);
  respond(Response.json({ success: true, data: { id: "class/id", instructor_id: "i2" } }));
  assert.equal((await saving).instructor_id, "i2");
});

test("missing instructor cannot be sent as an unassignment", async () => {
  for (const instructorId of [null, "", undefined]) {
    await assert.rejects(assignClassInstructor("c1", instructorId), /instructor/i);
  }
});

test("backend validation errors remain available to the dialog", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({
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
    mock.method(globalThis, "fetch", async () => Response.json(payload));
    await assert.rejects(assignClassInstructor("c1", "i2"), /confirm|rejected/i);
  }
});

test("collection requests forward cancellation", async () => {
  const controller = new AbortController();
  mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(options.signal, controller.signal);
    return Response.json({ data: [] });
  });
  assert.deepEqual(await getAdminAssignments({ signal: controller.signal }), { classes: [], programs: [], instructors: [] });
});

test("collection failures reject loading without supplying fake assignments", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ message: "Service unavailable." }, { status: 503 }));
  await assert.rejects(getAdminAssignments(), /Service unavailable/);
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
