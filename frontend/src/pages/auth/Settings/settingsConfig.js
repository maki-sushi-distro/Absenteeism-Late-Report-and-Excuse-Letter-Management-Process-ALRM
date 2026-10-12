export const ROLE_CONFIG = {
  administrator: {
    pageTitle: "Settings", pageDescription: "Manage your administrator profile and system settings.",
    profileTitle: "Admin Profile", profileDescription: "Your ALRM administrator account details.",
    preferencesTitle: "Notification Channel",
    preferencesDescription: "System notification channels currently supported by the backend.",
  },
  program_head: {
    pageTitle: "Settings", pageDescription: "Manage your program profile and preferences.",
    profileTitle: "Program Profile", profileDescription: "Your ALRM program account details.",
    preferencesTitle: "Program Preferences",
    preferencesDescription: "Notifications related to students, requests, and escalations in your program.",
  },
  instructor: {
    pageTitle: "Settings", pageDescription: "Manage your instructor profile and notification settings.",
    profileTitle: "Instructor Profile", profileDescription: "Your ALRM instructor account details.",
    preferencesTitle: "Notification Preferences",
    preferencesDescription: "Notifications for student excuse letters, late reports, and attendance updates.",
  },
  student: {
    pageTitle: "Settings", pageDescription: "Manage your student profile and notification settings.",
    profileTitle: "Student Profile", profileDescription: "Your ALRM student account details.",
    preferencesTitle: "Notification Preferences",
    preferencesDescription: "Notifications for request updates and attendance-related account activity.",
  },
};

const roleAliases = {
  admin: "administrator", administrator: "administrator", program: "program_head",
  program_head: "program_head", "program-head": "program_head", "program head": "program_head",
  instructor: "instructor", student: "student",
};

export function normalizeRole(role) {
  return roleAliases[String(role || "").trim().toLowerCase()] || null;
}

export function formatRole(role) {
  const normalized = normalizeRole(role);
  return ({ administrator: "Admin", program_head: "Program", instructor: "Instructor", student: "Student" })[normalized] || role || "Unknown";
}

export function valueOrFallback(value, fallback = "Not available") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

export function programLabel(user) {
  const names = (user?.programs ?? []).map((program) => program.program_name).filter(Boolean);
  return user?.program?.program_name || user?.headed_program?.program_name ||
    (names.length ? names.join(", ") : null) || user?.program_name || "Not assigned";
}

export function userInitials(name) {
  return String(name || "ALRM").trim().split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part[0]?.toUpperCase()).join("");
}
