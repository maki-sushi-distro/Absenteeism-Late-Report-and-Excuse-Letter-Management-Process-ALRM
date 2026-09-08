import { apiDownload, apiRequest, buildQuery } from "./client";

export function getAdminDashboard() {
  return apiRequest("/admin/dashboard");
}

export function getPendingUsers() {
  return apiRequest("/admin/users");
}

export function approveUser(userId, role) {
  return apiRequest(`/admin/users/${userId}/approve`, {
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

export function deleteClass(classId) {
  return apiRequest(`/admin/classes/${classId}`, { method: "DELETE" });
}

export function downloadReport(filters = {}) {
  return apiDownload(
    `/admin/reports/export${buildQuery(filters)}`,
    "alrm-requests-report.xlsx",
  );
}
