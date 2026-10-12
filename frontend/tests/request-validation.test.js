import assert from "node:assert/strict";
import { test } from "node:test";
import { initialForm } from "../src/pages/auth/student/StudentRequestForm/requestConfig.js";
import { firstInvalidRequestStep, validateRequestStep } from "../src/pages/auth/student/StudentRequestForm/requestValidation.js";

const enrolledClass = { class_id: "class-one", subject_name: "Information Management" };

test("request choice and privacy consent remain required", () => {
  assert.equal(validateRequestStep(initialForm, 0, [], {}).requestType, "Select a request.");
  assert.equal(validateRequestStep(initialForm, 2, [], {}).consent, "You must agree before continuing.");
  assert.deepEqual(validateRequestStep({ ...initialForm, consent: "agree" }, 2, [], ""), {});
});

test("student details reject numeric guardian names and invalid phone prefixes", () => {
  const form = { ...initialForm, studentName: "Alex Student", program: "BS in Information Systems",
    level: "1st year", guardianName: "Guardian 123", contactNumber: "08123456789",
    dateSubmitted: "2026-10-13" };
  const errors = validateRequestStep(form, 3, [], "");
  assert.match(errors.guardianName, /must not contain numbers/);
  assert.match(errors.contactNumber, /starting with 09 or \+639/);
  assert.deepEqual(validateRequestStep({ ...form, guardianName: "Alex Parent",
    contactNumber: "+639123456789" }, 3, [], ""), {});
});

test("late and absence details require enrolled classes", () => {
  const late = { ...initialForm, requestType: "late", minutesLate: "15", classId: "class-one", reason: "Traffic" };
  assert.deepEqual(validateRequestStep(late, 4, [enrolledClass], ""), {});
  const absence = { ...initialForm, requestType: "absence", startDateOfAbsence: "2026-10-13",
    endDateOfAbsence: "2026-10-14", classText: "Information Management",
    absenceReasons: ["Illness / Medical Condition"] };
  assert.deepEqual(validateRequestStep(absence, 4, [enrolledClass], ""), {});
  assert.match(validateRequestStep({ ...absence, classText: "Unknown" }, 4, [enrolledClass], "").classText,
    /matches one of your enrolled classes/);
});

test("declaration is required at final review", () => {
  assert.equal(validateRequestStep(initialForm, 6, [], "").declaration,
    "Confirm the declaration before submitting.");
  assert.deepEqual(validateRequestStep({ ...initialForm, declaration: true }, 6, [], ""), {});
});

test("final submission accepts a filled guardian name and returns to missing details", () => {
  const form = { ...initialForm, requestType: "late", consent: "agree",
    studentName: "Alex Student", program: "BS in Information Systems", level: "1st year",
    guardianName: "Alex Parent", contactNumber: "09123456789", dateSubmitted: "2026-10-13",
    minutesLate: "15", classId: "class-one", reason: "Traffic", declaration: true };
  assert.equal(firstInvalidRequestStep(form, [enrolledClass], ""), null);
  assert.deepEqual(firstInvalidRequestStep({ ...form, guardianName: "" }, [enrolledClass], ""), {
    step: 3, errors: { guardianName: "Enter a valid parent or guardian's name." },
  });
});
