import assert from "node:assert/strict";
import { test } from "node:test";
import { initialForm } from "../src/pages/auth/student/StudentRequestForm/requestConfig.js";
import { buildStudentRequestPayload } from "../src/pages/auth/student/StudentRequestForm/requestPayload.js";

const classes = [{ class_id: "class-one", subject_name: "Information Management" }];
const contact = { guardianName: "  Alex Parent  ", contactNumber: "09123456789" };

test("late requests send the filled guardian and contact fields", () => {
  const payload = buildStudentRequestPayload({ ...initialForm, ...contact,
    requestType: "late", classId: "class-one", minutesLate: "15", reason: "Traffic" }, classes);

  assert.equal(payload.guardian_name, "Alex Parent");
  assert.equal(payload.contact_number, "09123456789");
  assert.equal(payload.class_id, "class-one");
  assert.equal(payload.subjects_missed, "Information Management");
  assert.match(payload.reason, /Parent\/Guardian: Alex Parent/);
});

test("absence requests send the same guardian and contact fields", () => {
  const payload = buildStudentRequestPayload({ ...initialForm, ...contact,
    requestType: "absence", classText: "Information Management",
    startDateOfAbsence: "2026-10-13", endDateOfAbsence: "2026-10-14",
    absenceReasons: ["Illness / Medical Condition"] }, classes);

  assert.equal(payload.guardian_name, "Alex Parent");
  assert.equal(payload.contact_number, "09123456789");
  assert.equal(payload.class_id, "class-one");
  assert.equal(payload.minutes_late, null);
});
