import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createServer } from "vite";
import * as profileSetup from "../src/lib/profileSetup.js";

const yearOptions = [
  { value: "1st", label: "1st Year" },
  { value: "2nd", label: "2nd Year" },
];

let server;
let ProfileSetup;

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, ws: false },
    appType: "custom",
    plugins: [{
      name: "profile-setup-guard-state",
      enforce: "pre",
      transform(code, id) {
        const path = id.replaceAll("\\", "/");
        if (path.endsWith("/src/context/AuthContext.jsx")) {
          return "export function useAuth() { return globalThis.__profileSetupAuth; }";
        }
        if (path.endsWith("/src/pages/ProfileSetup.jsx")) {
          return code
            .replace("useState([])", "useState(globalThis.__profileSetupPrograms || [])")
            .replace("const [programsLoading, setProgramsLoading] = useState(true);", "const [programsLoading, setProgramsLoading] = useState(false);");
        }
      },
    }],
  });
  ({ default: ProfileSetup } = await server.ssrLoadModule("/src/pages/ProfileSetup.jsx"));
});

after(async () => { await server?.close(); });

function renderProfile(user, programs = [{ id: "program-1", program_name: "BSIS" }]) {
  globalThis.__profileSetupAuth = { user, refreshUser() {} };
  globalThis.__profileSetupPrograms = programs;
  return renderToStaticMarkup(React.createElement(MemoryRouter, null, React.createElement(ProfileSetup)));
}

function submitButton(html) {
  return html.match(/<button\b[^>]*type="submit"[^>]*>Continue to Dashboard<\/button>/)?.[0] || "";
}

function isDisabled(button) {
  return /\sdisabled(?:=""|(?=[\s>]))/.test(button);
}

test("students cannot continue until every required profile field is complete", () => {
  assert.equal(typeof profileSetup.isProfileSetupReady, "function");

  const complete = {
    role: "student",
    userId: "student-1",
    programId: "program-1",
    selectedProgramId: "program-1",
    studentNumber: "24-001",
    yearLevel: "1st",
    yearOptions,
  };

  assert.equal(profileSetup.isProfileSetupReady(complete), true);
  assert.equal(profileSetup.isProfileSetupReady({ ...complete, programId: "" }), false);
  assert.equal(profileSetup.isProfileSetupReady({ ...complete, selectedProgramId: "program-2" }), false);
  assert.equal(profileSetup.isProfileSetupReady({ ...complete, studentNumber: "   " }), false);
  assert.equal(profileSetup.isProfileSetupReady({ ...complete, yearLevel: "4th" }), false);
});

test("staff require their authenticated account ID and a loaded matching program", () => {
  const complete = {
    role: "instructor",
    userId: "staff-1",
    programId: "program-1",
    selectedProgramId: "program-1",
  };

  assert.equal(profileSetup.isProfileSetupReady(complete), true);
  assert.equal(profileSetup.isProfileSetupReady({ ...complete, userId: "" }), false);
  assert.equal(profileSetup.isProfileSetupReady({ ...complete, selectedProgramId: "" }), false);
  assert.equal(profileSetup.isProfileSetupReady({ ...complete, role: "program_head" }), true);
  assert.equal(profileSetup.isProfileSetupReady({ ...complete, role: "admin" }), false);
});

test("the form button is unavailable until the role-specific fields are complete", () => {
  const incompleteStudent = renderProfile({ id: "student-1", role: "student", program_id: "", school_student_id: "", year_level: "" });
  assert.equal(isDisabled(submitButton(incompleteStudent)), true);

  const completeStudent = renderProfile({ id: "student-1", role: "student", program_id: "program-1", school_student_id: "24-001", year_level: "1st" });
  assert.equal(isDisabled(submitButton(completeStudent)), false);

  const staffWithoutId = renderProfile({ role: "instructor", program_id: "program-1" });
  assert.equal(isDisabled(submitButton(staffWithoutId)), true);

  const completeStaff = renderProfile({ id: "staff-1", role: "program_head", program_id: "program-1" });
  assert.equal(isDisabled(submitButton(completeStaff)), false);
  assert.match(completeStaff, /Account ID/);
  assert.match(completeStaff, /staff-1/);
});
