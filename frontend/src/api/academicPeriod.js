import { apiRequest } from "./client.js";
import { clearResourceCache } from "./resourceCache.js";

function normalizeAcademicPeriod(period = {}) {
  return {
    semester: String(period.semester || ""),
    school_year: String(period.school_year || "").trim(),
  };
}

export function isConsecutiveSchoolYear(value) {
  const match = /^(\d{4})-(\d{4})$/.exec(String(value || "").trim());
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

export function academicPeriodsMatch(left, right) {
  const normalizedLeft = normalizeAcademicPeriod(left);
  const normalizedRight = normalizeAcademicPeriod(right);
  return normalizedLeft.semester === normalizedRight.semester
    && normalizedLeft.school_year === normalizedRight.school_year;
}

export function academicPeriodLabel(period) {
  const normalized = normalizeAcademicPeriod(period);
  return `${normalized.semester} Semester · A.Y. ${normalized.school_year}`;
}

export function academicPeriodError(error) {
  for (const field of ["semester", "school_year"]) {
    const message = error?.errors?.[field];
    if (Array.isArray(message) && message[0]) return message[0];
    if (typeof message === "string" && message) return message;
  }
  return error?.message || "Could not save the academic period.";
}

export function getAcademicPeriod(options = {}) {
  return apiRequest("/api/academic-period", options);
}

export async function updateAcademicPeriod(payload) {
  const requested = normalizeAcademicPeriod(payload);
  const updated = await apiRequest("/api/admin/academic-period", { method: "PUT", body: JSON.stringify(requested) });
  if (!academicPeriodsMatch(updated, requested)) {
    throw new Error("The server did not confirm the academic period update. Reload before trying again.");
  }
  clearResourceCache();
  return updated;
}
