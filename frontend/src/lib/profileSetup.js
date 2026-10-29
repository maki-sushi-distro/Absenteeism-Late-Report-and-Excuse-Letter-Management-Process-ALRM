import { normalizeRole } from "./roles.js";
import { getSessionVersion } from "../api/client.js";

const LEGACY_PREFIX = "alrm_profile_setup:";
const STAFF_CONFIRMATION_PREFIX = "alrm_staff_profile_setup:";
const memoryConfirmations = new Map();
const pageSessionVersion = globalThis.crypto?.randomUUID?.() || `page-${Date.now()}`;

export const YEAR_LEVELS = [
  { value: "1st", label: "1st Year" },
  { value: "2nd", label: "2nd Year" },
  { value: "3rd", label: "3rd Year" },
  { value: "4th", label: "4th Year" },
];

export const ASSOCIATE_YEAR_LEVELS = YEAR_LEVELS.slice(0, 2);

export function getProfileSetupRoleOptions(email) {
  const domain = String(email || "")
    .trim()
    .toLowerCase()
    .match(/^[^\s@]+@([^\s@]+)$/)?.[1];

  if (domain === "student.laverdad.edu.ph") {
    return [{ label: "Student", value: "student" }];
  }

  if (domain === "laverdad.edu.ph") {
    return [
      { label: "Instructor", value: "instructor" },
      { label: "Program Head", value: "program_head" },
    ];
  }

  return [];
}

/** Burahin ang lumang localStorage na pinagmulan ng maling "complete" state. */
export function clearLegacyProfileSetup() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(LEGACY_PREFIX))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore (private mode, atbp.)
  }
}

export function getStoredProfileSetup(user) {
  if (!user) return null;

  return {
    role: user.role ?? "",
    program_id: user.program_id ?? null,
    program_name: user.program?.program_name ?? "",
    student_number: user.school_id_number ?? "",
    year_level: user.year_level ?? "",
  };
}

export function splitVerifiedName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

function hasValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function staffConfirmation(user, options = {}) {
  const role = normalizeRole(user?.role);
  if (!user?.id || !["instructor", "program"].includes(role)) return null;
  return {
    key: `${STAFF_CONFIRMATION_PREFIX}${user.id}:${role}`,
    version: String(options.sessionVersion ?? getSessionVersion() ?? pageSessionVersion),
    storage: Object.hasOwn(options, "storage") ? options.storage : globalThis.sessionStorage,
  };
}

function hasStaffProfileConfirmation(user, options) {
  const confirmation = staffConfirmation(user, options);
  if (!confirmation) return false;
  try {
    if (confirmation.storage?.getItem(confirmation.key) === confirmation.version) return true;
  } catch {
    // The in-memory marker still allows the confirmed form to continue.
  }
  return memoryConfirmations.get(confirmation.key) === confirmation.version;
}

export function confirmStaffProfileSetup(user, options) {
  const confirmation = staffConfirmation(user, options);
  if (!confirmation) return false;
  memoryConfirmations.set(confirmation.key, confirmation.version);
  try { confirmation.storage?.setItem(confirmation.key, confirmation.version); } catch { /* optional storage */ }
  return true;
}

export function isProfileSetupReady({
  role,
  userId,
  schoolIdNumber = "",
  programId,
  selectedProgramId,
  yearLevel = "",
  yearOptions = [],
}) {
  const normalizedRole = normalizeRole(role);
  const hasSelectedProgram =
    hasValue(programId) &&
    hasValue(selectedProgramId) &&
    String(programId) === String(selectedProgramId);

  if (!hasSelectedProgram) return false;
  if (normalizedRole === "student") {
    return hasValue(schoolIdNumber) && yearOptions.some((year) => year.value === yearLevel);
  }

  if (normalizedRole === "instructor") return hasValue(schoolIdNumber);
  return normalizedRole === "program" && hasValue(userId);
}

/**
 * Server data lang ang pinagbabatayan (galing sa /api/auth/me).
 * Student:  program_id + year_level + school_id_number
 * Instructor: assigned program plus a server-confirmed form submission in this session
 * Program Head: assigned by an administrator, so no self-service setup is required
 */
export function isProfileSetupComplete(user, options) {
  if (!user) return false;

  const role = normalizeRole(user.role);
  if (!hasValue(role)) return false;
  if (["admin", "program"].includes(role)) return true;

  if (role === "student") {
    return (
      hasValue(user.program_id) &&
      hasValue(user.year_level) &&
      hasValue(user.school_id_number)
    );
  }

  const hasAssignedProgram = (
    hasValue(user.program_id) ||
    (Array.isArray(user.programs) && user.programs.length > 0)
  );
  return hasAssignedProgram && hasValue(user.school_id_number) && hasStaffProfileConfirmation(user, options);
}

export function needsProfileSetup(user, options) {
  return Boolean(user) && !isProfileSetupComplete(user, options);
}
