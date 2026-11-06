import assert from "node:assert/strict";
import { afterEach, beforeEach, mock, test } from "node:test";
import { mockApiFetch } from "./helpers/mockApiFetch.js";

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => "test-session", setItem() {}, removeItem() {} },
  });
});

afterEach(() => {
  mock.restoreAll();
  delete globalThis.localStorage;
});

test("Boyer-Moore matches normalized substrings exactly like String.includes", async () => {
  const search = await import("../src/lib/boyerMoore.js").catch(() => null);
  assert.equal(typeof search?.compileBoyerMoore, "function");
  assert.equal(typeof search?.prepareAssignmentSearchText, "function");

  const records = [
    { displayInstructor: "Rancel Dela Cruz", subject_name: "Data Structures", displayProgram: "BSIS", section: "3A" },
    { displayInstructor: "Ada Lovelace", subject_name: "Discrete Mathematics", displayProgram: "BSA", section: "2B" },
    { displayInstructor: "Grace Hopper", subject_name: "Programming", displayProgram: "BSCS", section: "1A" },
  ];
  for (const query of ["rancel", " RANCEL ", "math", "bscs", "1a", "missing", ""]) {
    const matcher = search.compileBoyerMoore(query);
    const normalized = query.normalize("NFKC").trim().toLowerCase();
    for (const record of records) {
      const text = search.prepareAssignmentSearchText(record);
      assert.equal(matcher.matchesPrepared(text), normalized === "" || text.includes(normalized), `${query} in ${text}`);
    }
  }
});

test("Boyer-Moore randomized matching agrees with normalized substring matching", async () => {
  const search = await import("../src/lib/boyerMoore.js").catch(() => null);
  assert.equal(typeof search?.compileBoyerMoore, "function");
  let seed = 421;
  const next = () => (seed = (seed * 1664525 + 1013904223) >>> 0);
  const alphabet = "abc xyz";
  for (let sample = 0; sample < 250; sample += 1) {
    const text = Array.from({ length: next() % 80 }, () => alphabet[next() % alphabet.length]).join("");
    const pattern = Array.from({ length: next() % 12 }, () => alphabet[next() % alphabet.length]).join("");
    const normalizedPattern = pattern.normalize("NFKC").trim().toLowerCase();
    assert.equal(
      search.compileBoyerMoore(pattern).matches(text),
      normalizedPattern === "" || text.normalize("NFKC").toLowerCase().includes(normalizedPattern),
    );
  }
});

test("Manage API separates stable references from filtered class pages", async () => {
  const api = await import("../src/api/adminAssignments.js");
  assert.equal(typeof api.getAdminAssignmentReferences, "function");
  assert.equal(typeof api.getAdminAssignmentPage, "function");
  const calls = [];
  mockApiFetch(async (url) => {
    const request = new URL(url, "http://fixture.local");
    calls.push(request);
    if (request.pathname === "/api/admin/classes") {
      return Response.json({ data: [{ id: "class-rancel" }], meta: { page: 2, per_page: 25, total: 1, last_page: 2 } });
    }
    if (request.pathname === "/api/admin/programs") return Response.json({ data: [{ id: "p1" }] });
    if (request.pathname === "/api/admin/users") return Response.json({ data: [{ id: "i1", role: "instructor", status: "approved" }] });
    throw new Error(`Unexpected request: ${request.pathname}`);
  });

  const references = await api.getAdminAssignmentReferences();
  const page = await api.getAdminAssignmentPage({ page: 2, filters: { search: "  Rancel  ", programId: "p1" } });

  assert.deepEqual(references, { programs: [{ id: "p1" }], instructors: [{ id: "i1", role: "instructor", status: "approved" }] });
  assert.deepEqual(page.classes, [{ id: "class-rancel" }]);
  assert.equal(page.classesMeta.page, 2);
  assert.deepEqual(calls.map(request => request.pathname), ["/api/admin/programs", "/api/admin/users", "/api/admin/classes"]);
  assert.equal(calls[2].searchParams.get("search"), "Rancel");
  assert.equal(calls[2].searchParams.get("program_id"), "p1");
  assert.equal(calls[2].searchParams.get("page"), "2");
});
