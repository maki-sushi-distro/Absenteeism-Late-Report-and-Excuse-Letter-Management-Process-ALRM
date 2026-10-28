import { apiDownload, apiRequest, buildQuery } from "./client.js";

export function getAdminDashboard() {
  return apiRequest("/admin/dashboard");
}

export function getAdminUsers() {
  return apiRequest("/admin/users");
}

export function updateStaffRole(userId, role) {
  return apiRequest(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function getPrograms() {
  return apiRequest("/admin/programs");
}

export function createProgram(data) {
  return apiRequest("/admin/programs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateProgram(programId, data) {
  return apiRequest(`/admin/programs/${programId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteProgram(programId) {
  return apiRequest(`/admin/programs/${programId}`, { method: "DELETE" });
}

export function getClasses() {
  return apiRequest("/admin/classes");
}

export function createClass(data) {
  return apiRequest("/admin/classes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateClass(classId, data) {
  return apiRequest(`/admin/classes/${classId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteClass(classId) {
  const result = await apiRequest(`/admin/classes/${encodeURIComponent(classId)}`, { method: "DELETE" });
  if (result?.success === false) throw new Error(result.message || "The class could not be removed.");
  return result;
}

export function downloadReport(filters = {}) {
  return apiDownload(
    `/admin/reports/export${buildQuery(filters)}`,
    "alrm-requests-report.xlsx",
  );
}
