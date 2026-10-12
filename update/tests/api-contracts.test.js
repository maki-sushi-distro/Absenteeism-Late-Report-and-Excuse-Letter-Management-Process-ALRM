import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { getAdminStudents } from "../src/api/adminStudents.js";
import { createInstructor, createStudent } from "../src/api/adminUsers.js";
import { saveProfileSetup } from "../src/api/profileSetup.js";
import { createStudentRequest, getStudentRequest, updateStudentRequest, openEvidence } from "../src/api/studentRequests.js";

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => "test-session",
      setItem: () => {},
      removeItem: () => {},
    },
  });
  globalThis.window = new EventTarget();
});

afterEach(() => {
  mock.restoreAll();
  delete globalThis.document;
});

function captureEvidenceViewer(type) {
  const popup = { opener: {}, location: { href: "" }, closed: false, close() { this.closed = true; } };
  const link = { click: mock.fn() };
  window.open = () => popup;
  globalThis.document = { createElement: () => link };
  mock.method(globalThis, "fetch", async () => new Response("file bytes", { headers: { "Content-Type": type } }));
  mock.method(URL, "createObjectURL", () => "blob:test-attachment");
  mock.method(URL, "revokeObjectURL", () => {});
  mock.method(globalThis, "setTimeout", (callback) => { callback(); return 0; });
  return { popup, link };
}

test("evidence viewer downloads PDF blobs instead of opening them", async () => {
  const { popup, link } = captureEvidenceViewer("application/pdf");
  await openEvidence("request-one");
  assert.equal(popup.opener, null);
  assert.equal(popup.closed, true);
  assert.equal(popup.location.href, "");
  assert.equal(link.download, "attachment.pdf");
  assert.equal(link.click.mock.callCount(), 1);
});

test("evidence viewer opens allowed images without an opener", async () => {
  const { popup, link } = captureEvidenceViewer("image/jpeg");
  await openEvidence("request-one");
  assert.equal(popup.opener, null);
  assert.equal(popup.location.href, "blob:test-attachment");
  assert.equal(link.click.mock.callCount(), 0);
});

test("evidence viewer rejects HTML attachment responses", async () => {
  const { popup, link } = captureEvidenceViewer("text/html");
  await assert.rejects(openEvidence("request-one"), /Unsupported attachment/);
  assert.equal(popup.closed, true);
  assert.equal(popup.location.href, "");
  assert.equal(link.click.mock.callCount(), 0);
});

function captureJsonRequest(responseBody = { success: true }) {
  const requests = [];
  mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({
      url: String(url),
      method: options.method || "GET",
      body: options.body ? JSON.parse(options.body) : null,
    });
    return Response.json(responseBody);
  });
  return requests;
}

test("request edit reads existing proof selections from the detail endpoint", async () => {
  const record = { id: "request-one", proof_types: ["Medical Certificate"] };
  const requests = captureJsonRequest({ success: true, data: record });
  assert.deepEqual(await getStudentRequest("request-one"), record);
  assert.equal(requests[0].method, "GET");
  assert.ok(requests[0].url.endsWith("/api/requests/request-one"));
});

test("request update sends proof selections and cleared arrays via PATCH", async () => {
  const requests = captureJsonRequest({ success: true, data: { id: "request-one", proof_types: [] } });
  await updateStudentRequest("request-one", { reason: "Family Emergency", proof_types: ["Others"] });
  await updateStudentRequest("request-one", { reason: "Family Emergency", proof_types: [] });
  assert.equal(requests[0].method, "PATCH");
  assert.ok(requests[0].url.endsWith("/api/requests/request-one"));
  assert.deepEqual(requests[0].body.proof_types, ["Others"]);
  assert.deepEqual(requests[1].body.proof_types, []);
});

test("create and update preserve proof validation errors from the backend", async () => {
  const errors = { proof_types: ["Invalid array."], "proof_types.0": ["Invalid proof label."] };
  mock.method(globalThis, "fetch", async () => Response.json({ message: "Validation failed.", errors }, { status: 422 }));
  for (const submit of [() => createStudentRequest({ proof_types: ["Bad"] }), () => updateStudentRequest("request-one", { proof_types: ["Bad"] })]) {
    await assert.rejects(submit, (error) => {
      assert.equal(error.status, 422);
      assert.deepEqual(error.validationErrors, errors);
      return true;
    });
  }
});

test("profile setup uses the backend complete-profile contract", async () => {
  const requests = captureJsonRequest();
  const payload = {
    program_id: "43b62cb1-65b9-4ea3-bf83-b65b0eed3ab0",
    school_student_id: "2026-1001",
    year_level: "1st",
  };

  await saveProfileSetup(payload);

  assert.equal(requests[0].method, "POST");
  assert.ok(requests[0].url.endsWith("/api/complete-profile"));
  assert.deepEqual(requests[0].body, payload);
});

test("student requests post all fields required by the backend", async () => {
  const requests = captureJsonRequest();
  const payload = {
    class_id: "19b10b16-3f80-43b5-ad10-670b735a84f3",
    type: "late",
    subjects_missed: "Information Management",
    minutes_late: 15,
    start_date_of_absence: null,
    end_date_of_absence: null,
    reason: "Transport delay",
    evidence_file_url: null,
    evidence_type: null,
  };

  await createStudentRequest(payload);

  assert.equal(requests[0].method, "POST");
  assert.ok(requests[0].url.endsWith("/api/requests"));
  assert.deepEqual(requests[0].body, payload);
});

test("admin student listing uses the users endpoint and filters locally", async () => {
  const requests = captureJsonRequest({
    data: [
      {
        id: "student-one",
        name: "Alex Student",
        email: "alex@student.laverdad.edu.ph",
        role: "student",
        program_id: "program-one",
        school_student_id: "2026-1001",
        year_level: "1st",
      },
      {
        id: "student-two",
        name: "Jamie Student",
        role: "student",
        program_id: "program-two",
        year_level: "2nd",
      },
    ],
  });

  const students = await getAdminStudents({
    search: "2026-1001",
    programId: "program-one",
    yearLevel: "1st Year",
  });

  assert.ok(requests[0].url.endsWith("/api/admin/users?role=student"));
  assert.deepEqual(students.map((student) => student.id), ["student-one"]);
});

test("admin pre-registration only sends fields the backend persists", async () => {
  const requests = captureJsonRequest();

  await createStudent({
    fullName: "Alex Student",
    email: "ALEX@STUDENT.LAVERDAD.EDU.PH",
    studentId: "ignored",
    programId: "program-one",
    yearLevel: "1st",
    status: "active",
  });
  await createInstructor({
    fullName: "Jamie Instructor",
    email: "JAMIE@LAVERDAD.EDU.PH",
    employeeId: "ignored",
    programId: "program-one",
    subjectHandled: "ignored",
    status: "active",
  });

  assert.deepEqual(requests.map((request) => request.body), [
    {
      name: "Alex Student",
      email: "alex@student.laverdad.edu.ph",
      role: "student",
    },
    {
      name: "Jamie Instructor",
      email: "jamie@laverdad.edu.ph",
      role: "instructor",
    },
  ]);
});
