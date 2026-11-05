import assert from "node:assert/strict";
import { test } from "node:test";
import { saveAndConfirmProfile } from "../src/lib/profileSetup.js";

const completeUsers = {
  student: { id: "student-1", role: "student", program_id: "program-1", school_id_number: "24-001", year_level: "1st" },
  instructor: { id: "instructor-1", role: "instructor", program_id: null, programs: [{ id: "program-1" }], school_id_number: "FAC-001" },
};

test("student and instructor profile saves are followed by a fresh complete user", async () => {
  for (const user of Object.values(completeUsers)) {
    const calls = [];
    const result = await saveAndConfirmProfile({
      saved: false,
      payload: { school_id_number: user.school_id_number },
      save: async () => calls.push("save"),
      refresh: async options => { calls.push(options); return user; },
    });

    assert.deepEqual(calls, ["save", { fresh: true }]);
    assert.deepEqual(result, { saved: true, user, complete: true });
  }
});

test("a failed fresh-user request retries without a second profile save", async () => {
  let saves = 0;
  let refreshes = 0;
  const save = async () => { saves += 1; };
  const refresh = async () => {
    refreshes += 1;
    if (refreshes === 1) throw new TypeError("offline");
    return completeUsers.student;
  };

  const failed = await saveAndConfirmProfile({ saved: false, payload: {}, save, refresh });
  assert.equal(failed.saved, true);
  assert.equal(failed.complete, false);
  assert.match(failed.error.message, /offline/);
  const retried = await saveAndConfirmProfile({ saved: failed.saved, payload: {}, save, refresh });

  assert.equal(saves, 1);
  assert.equal(refreshes, 2);
  assert.equal(retried.complete, true);
});

test("a fresh but incomplete user is not confirmed for dashboard navigation", async () => {
  const user = { ...completeUsers.student, year_level: null };
  const result = await saveAndConfirmProfile({ saved: true, payload: {}, save: async () => {}, refresh: async () => user });
  assert.deepEqual(result, { saved: true, user, complete: false });
});
