import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let server;

before(async () => {
  server = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
});

after(async () => {
  await server?.close();
});

test("remove assignment dialog describes the result entirely in English", async () => {
  const { removeAssignmentDescription } = await server.ssrLoadModule("/src/pages/auth/admin/manage/removeAssignmentText.js");
  const row = { id: "class-one", subject_name: "Data Structures", section: "3A", instructor_id: "instructor-one" };
  const instructors = [{ id: "instructor-one", name: "Ada Lovelace" }];
  const description = removeAssignmentDescription(row, instructors);

  assert.equal(description, "Ada Lovelace will be removed from Data Structures — 3A. The class, enrolled students, and request history will remain. The class will become Unassigned.");
  assert.doesNotMatch(description, /Aalisin|Mananatili|Magiging/);
});
