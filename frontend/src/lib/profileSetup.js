import { normalizeRole } from "./roles.js";

const LEGACY_PREFIX = "alrm_profile_setup:";

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
    student_number: user.school_student_id ?? "",
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

/**
 * Server data lang ang pinagbabatayan (galing sa /api/auth/me).
 * Student:  program_id + year_level + school_student_id
 * Staff:    may program_id O may laman ang `programs` (many-to-many)
 */
export function isProfileSetupComplete(user) {
  if (!user) return false;

  const role = normalizeRole(user.role);
  if (!hasValue(role)) return false;
  if (role === "admin") return true;

  if (role === "student") {
    return (
      hasValue(user.program_id) &&
      hasValue(user.year_level) &&
      hasValue(user.school_student_id)
    );
  }

  // instructor / program head
  return (
    hasValue(user.program_id) ||
    (Array.isArray(user.programs) && user.programs.length > 0)
  );
}

export function needsProfileSetup(user) {
  return Boolean(user) && !isProfileSetupComplete(user);
}