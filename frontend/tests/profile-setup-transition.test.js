import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { createServer } from "vite";

let server;
let ProfileSetup;
const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

before(async () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem() { return null; }, setItem() {}, removeItem() {} },
  });
  server = await createServer({
    server: { middlewareMode: true, ws: false },
    appType: "custom",
    plugins: [{
      name: "profile-setup-transition",
      enforce: "pre",
      transform(code, id) {
        const path = id.replaceAll("\\", "/");
        if (path.endsWith("/src/context/AuthContext.jsx")) {
          return "export function useAuth() { return globalThis.__profileTransitionAuth; }";
        }
        if (path.endsWith("/src/api/profileSetup.js")) {
          return `export async function getProfileSetupPrograms() { return []; }
            export async function saveProfileSetup(payload) { return globalThis.__profileTransitionSave(payload); }`;
        }
        if (path.endsWith("/src/pages/ProfileSetup.jsx")) {
          return code.replace(
            'import { useNavigate } from "react-router-dom";',
            "const useNavigate = () => globalThis.__profileTransitionNavigate;",
          );
        }
      },
    }],
  });
  ({ default: ProfileSetup } = await server.ssrLoadModule("/src/pages/ProfileSetup.jsx"));
});

after(async () => {
  await server?.close();
  delete globalThis.__profileTransitionAuth;
  delete globalThis.__profileTransitionNavigate;
  delete globalThis.__profileTransitionSave;
  if (originalLocalStorage) Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  else delete globalThis.localStorage;
});

function mount(render) {
  const slots = [];
  let cursor = 0;
  let pending = [];
  let value;
  const same = (a, b) => a && b && a.length === b.length && a.every((item, index) => Object.is(item, b[index]));
  const dispatcher = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: typeof initial === "function" ? initial() : initial };
      return [slots[index].value, next => { slots[index].value = typeof next === "function" ? next(slots[index].value) : next; }];
    },
    useMemo(factory, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { value: factory(), deps };
      return slots[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) {
        slots[index] = { deps };
        pending.push(effect);
      }
    },
  };
  function update() {
    cursor = 0;
    const internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    const previous = internals.H;
    internals.H = dispatcher;
    try { value = render(); } finally { internals.H = previous; }
    const effects = pending;
    pending = [];
    effects.forEach(effect => effect());
    return value;
  }
  update();
  return { get value() { return value; }, update };
}

function findElement(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (!node || typeof node !== "object" || !node.props) return null;
  if (predicate(node)) return node;
  return findElement(node.props.children, predicate);
}

const cases = [
  {
    role: "student",
    initial: {
      id: "student-1", role: "student", program_id: "program-1",
      program: { id: "program-1", program_name: "BSIS" },
      school_id_number: "24-001", year_level: null,
    },
    complete: {
      id: "student-1", role: "student", program_id: "program-1",
      program: { id: "program-1", program_name: "BSIS" },
      school_id_number: "24-001", year_level: "1st",
    },
    field: "setup-year",
    value: "1st",
  },
  {
    role: "instructor",
    initial: {
      id: "instructor-1", role: "instructor", program_id: null,
      programs: [{ id: "program-1", program_name: "BSIS" }],
      school_id_number: null,
    },
    complete: {
      id: "instructor-1", role: "instructor", program_id: null,
      programs: [{ id: "program-1", program_name: "BSIS" }],
      school_id_number: "FAC-001",
    },
    field: "setup-school-id-number",
    value: "FAC-001",
  },
];

for (const scenario of cases) {
  test(`${scenario.role} waits for the completed AuthContext user before navigating to dashboard`, async () => {
    const destinations = [];
    globalThis.__profileTransitionNavigate = (...args) => destinations.push(args);
    globalThis.__profileTransitionSave = async () => ({ success: true });
    globalThis.__profileTransitionAuth = {
      user: scenario.initial,
      refreshUser: async () => scenario.complete,
    };

    const page = mount(() => ProfileSetup());
    const field = findElement(page.value, element => element.props.id === scenario.field);
    assert.ok(field, `Expected ${scenario.field}`);
    field.props.onChange({ target: { value: scenario.value } });
    page.update();

    const form = findElement(page.value, element => element.type === "form");
    assert.ok(form, "Expected profile setup form");
    await form.props.onSubmit({ preventDefault() {} });

    assert.deepEqual(destinations, [], "dashboard navigation ran before AuthContext published the completed user");

    globalThis.__profileTransitionAuth = {
      ...globalThis.__profileTransitionAuth,
      user: scenario.complete,
    };
    page.update();
    assert.deepEqual(destinations, [["/dashboard", { replace: true }]]);
  });
}
