import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { mockApiFetch } from "./helpers/mockApiFetch.js";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { prepareClassInput, scheduleTotals } from "../src/lib/formInputs.js";

const base = {
  subject_name: "Algorithms", section: "3A", program_id: "p1",
  curriculum_subject_id: "s1", semester: "1st", year_level: "3rd",
  school_year: "2026-2027",
};

beforeEach(() => Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => "session" } }));
afterEach(() => { mock.restoreAll(); delete globalThis.localStorage; });

test("schedule totals sum meeting durations and count rows", () => {
  assert.deepEqual(scheduleTotals([
    { day: "Mon", start: "08:00", end: "10:30", room: "A" },
    { day: "Wed", start: "13:00", end: "15:30", room: "" },
  ]), { weeklyHours: 5, meetingsPerWeek: 2 });
});

test("class input requires complete non-overlapping meetings and limits room length", () => {
  assert.throws(() => prepareClassInput({ ...base, schedule: [] }), /at least one complete meeting/i);
  assert.throws(() => prepareClassInput({ ...base, schedule: [{ day: "Mon", start: "", end: "10:00", room: "" }] }), /valid day/i);
  assert.throws(() => prepareClassInput({ ...base, schedule: [
    { day: "Mon", start: "08:00", end: "10:00", room: "A" },
    { day: "Mon", start: "09:30", end: "11:00", room: "B" },
  ] }), /overlap/i);
  assert.throws(() => prepareClassInput({ ...base, schedule: [{ day: "Tue", start: "08:00", end: "09:00", room: "x".repeat(101) }] }), /100 characters/i);
  const payload = prepareClassInput({ ...base, schedule: [{ day: "Tue", start: "08:00", end: "10:30", room: "" }] });
  assert.equal(Object.hasOwn(payload, "weekly_hours"), false);
  assert.equal(Object.hasOwn(payload, "meetings_per_week"), false);
});

test("applicable curriculum resolves one version or the existing subject and rejects ambiguity", async () => {
  const { getApplicableCurriculum } = await import("../src/api/adminCurricula.js");
  let curricula = [{ id: "c1" }];
  const details = {
    c1: { id: "c1", subjects: [{ id: "s1" }] },
    c2: { id: "c2", subjects: [{ id: "s2" }] },
  };
  mockApiFetch(async url => {
    const path = String(url);
    if (path.includes("/admin/curricula?")) return Response.json({ data: curricula });
    return Response.json({ success: true, data: details[path.split("/").at(-1)] });
  });
  assert.equal((await getApplicableCurriculum("p1")).id, "c1");
  curricula = [{ id: "c1" }, { id: "c2" }];
  assert.equal((await getApplicableCurriculum("p1", "s2")).id, "c2");
  await assert.rejects(getApplicableCurriculum("p1"), /multiple curricula/i);
});

test("new class form removes curriculum and manual-hour selectors and starts with one meeting", async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
  try {
    const ClassForm = (await server.ssrLoadModule("/src/pages/auth/admin/classes/ClassForm.jsx")).default;
    const html = renderToStaticMarkup(React.createElement(ClassForm, { programs: [{ id: "p1", program_name: "BSIS" }], onSave() {}, onCancel() {} }));
    assert.doesNotMatch(html, /Curriculum Version|Confirmed weekly contact hours|Confirmed meetings per week/);
    assert.equal((html.match(/Remove meeting 1/g) || []).length, 1);
    assert.match(html, /Weekly contact hours/);
    assert.match(html, /Meetings per week/);
  } finally { await server.close(); }
});
