import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { filterRecords, groupRecordsByMonth, instructorOf, recordDate, reviewStatus } from "../src/pages/auth/student/records/recordData.js";
import { paginateRecords } from "../src/pages/auth/student/records/pagination.js";

const records = [
  { id: "absence-1", type: "absence", status: "approved", subjects_missed: "Math", start_date_of_absence: "2026-10-19", reason: "Illness" },
  { id: "late-1", type: "late", status: "pending", subjects_missed: "English", start_date_of_absence: "2026-10-21", date_submitted: "2026-10-20", reason: "Traffic" },
  { id: "absence-2", type: "absence", status: "pending", enrollment: { class: { subject_name: "English" } }, start_date_of_absence: "2026-10-20", reason: "Personal reason" },
  { id: "late-2", type: "late", status: "approved", subjects_missed: "Math", start_date_of_absence: "2026-10-18", date_submitted: "2026-10-19", reason: "Traffic" },
];

test("each tab contains only its own request type, ordered newest first", () => {
  assert.deepEqual(filterRecords(records, "all").map((record) => record.id), ["late-1", "absence-2", "absence-1", "late-2"]);
  assert.deepEqual(filterRecords(records, "absence").map((record) => record.id), ["absence-2", "absence-1"]);
  assert.deepEqual(filterRecords(records, "late").map((record) => record.id), ["late-1", "late-2"]);
  assert.equal(records[0].id, "absence-1");
});

test("record dates, instructor fallback and month groups use the displayed Manila occurrence date", () => {
  assert.equal(recordDate(records[1]), "2026-10-21");
  assert.equal(instructorOf({ enrollment: { class: { instructor: { name: "Prof. Reyes" } } } }), "Prof. Reyes");
  assert.equal(instructorOf(records[0]), "Unavailable");
  const boundary = [
    { id: "oct", type: "late", start_date_of_absence: "2026-10-31T16:30:00Z" },
    { id: "jan", type: "absence", start_date_of_absence: "2027-01-01" },
    { id: "missing", type: "absence" },
  ];
  assert.deepEqual(groupRecordsByMonth(boundary).map(group => [group.label, group.records.map(record => record.id)]), [
    ["January 2027", ["jan"]],
    ["November 2026", ["oct"]],
    ["Date unavailable", ["missing"]],
  ]);
});

test("subject and case-insensitive search stay scoped to the selected tab", () => {
  assert.deepEqual(filterRecords(records, "absence", "pending", "English").map((record) => record.id), ["absence-2"]);
  assert.deepEqual(filterRecords(records, "late", "  APPROVED ").map((record) => record.id), ["late-2"]);
  assert.deepEqual(filterRecords(records, "absence", "Traffic"), []);
});

test("ten-row pagination applies after filtering the record type", () => {
  const many = Array.from({ length: 24 }, (_, index) => ({ id: index, type: index % 2 ? "late" : "absence", status: "pending" }));
  for (const type of ["absence", "late"]) {
    const filtered = filterRecords(many, type);
    assert.equal(paginateRecords(filtered, 1).pageRecords.length, 10);
    assert.equal(paginateRecords(filtered, 2).pageRecords.length, 2);
    assert.ok(filtered.every((record) => record.type === type));
  }
});

test("status labels represent backend decisions without relabelling other outcomes", () => {
  assert.equal(reviewStatus("approved"), "Approved");
  assert.equal(reviewStatus("pending"), "Pending");
  assert.equal(reviewStatus("invalid"), "Invalid");
  assert.equal(reviewStatus("noted"), "Approved");
  assert.equal(reviewStatus("cancelled"), "Cancelled");
});

test("My Records renders the required columns and the All tab", () => {
  const source = readFileSync(new URL("../src/pages/auth/student/StudentRecords.jsx", import.meta.url), "utf8");
  const headings = [...source.matchAll(/<th scope="col"[^>]*>([^<]+)<\/th>/g)].map(match => match[1]);
  assert.deepEqual(headings, ["Date", "Subject", "Instructor", "Type", "Request Status", "Action"]);
  assert.match(source, /<RecordsTabs[^>]*includeAll/);
});
