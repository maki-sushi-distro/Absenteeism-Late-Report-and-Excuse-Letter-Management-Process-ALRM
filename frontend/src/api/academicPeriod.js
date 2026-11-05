import { apiRequest } from "./client.js";

export function isConsecutiveSchoolYear(value) {
  const match = /^(\d{4})-(\d{4})$/.exec(String(value || "").trim());
  return Boolean(match && Number(match[2]) === Number(match[1]) + 1);
}

export function getAcademicPeriod(options = {}) {
  return apiRequest("/api/academic-period", options);
}

export async function updateAcademicPeriod(payload) {
  const updated = await apiRequest("/api/admin/academic-period", { method: "PUT", body: JSON.stringify(payload) });
  if (updated?.semester !== payload.semester || updated?.school_year !== payload.school_year) {
    throw new Error("The server did not confirm the academic period update. Reload before trying again.");
  }
  return updated;
}
