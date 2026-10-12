import { apiFetch } from "./client.js";

async function request(path, options) {
  const response = await apiFetch(path, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    // The error below also covers non-JSON gateway responses.
  }
  if (!response.ok || body?.success === false) {
    const firstField = Object.values(body?.errors || {})[0];
    const error = new Error(firstField?.[0] || body?.message || `Request failed (${response.status}).`);
    error.status = response.status;
    error.fields = body?.errors || {};
    throw error;
  }
  return body?.data ?? null;
}

function json(method, payload) {
  return { method, body: JSON.stringify(payload) };
}

export const getAdminDashboard = () => request("/api/admin/dashboard");
export const getInstructorDashboard = () => request("/api/instructor/dashboard");
export const getProgramHeadDashboard = () => request("/api/program-head/dashboard");
export const getStudentAttendance = () => request("/api/attendance/summary");
export const getStudentRequestHistory = () => request("/api/requests");
export const getInstructorRequests = () => request("/api/instructor/requests");
export const getProgramHeadRequests = (status = "") => request(`/api/program-head/requests${status ? `?status=${encodeURIComponent(status)}` : ""}`);
export const getFlaggedStudents = (status = "") => request(`/api/program-head/students/flagged${status ? `?status=${encodeURIComponent(status)}` : ""}`);
export const decideInstructorRequest = (id, status) => request(`/api/instructor/requests/${encodeURIComponent(id)}/decision`, json("PATCH", { status }));
export const getAdminUsers = (role = "") => request(`/api/admin/users${role ? `?role=${encodeURIComponent(role)}` : ""}`);
export const updateAdminUserStatus = (id, status) => request(`/api/admin/users/${encodeURIComponent(id)}/status`, json("PATCH", { status }));
export const updateAdminUserRole = (id, role) => request(`/api/admin/users/${encodeURIComponent(id)}/role`, json("PATCH", { role }));
export const deleteAdminUser = (id) => request(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getPrograms = () => request("/api/admin/programs");
export const createProgram = (payload) => request("/api/admin/programs", json("POST", payload));
export const updateProgram = (id, payload) => request(`/api/admin/programs/${encodeURIComponent(id)}`, json("PATCH", payload));
export const deleteProgram = (id) => request(`/api/admin/programs/${encodeURIComponent(id)}`, { method: "DELETE" });
export const getAdminClasses = () => request("/api/admin/classes");
export const getReportPreview = (params) => request(`/api/admin/reports/preview?${new URLSearchParams(params)}`);

export async function downloadReport(params) {
  const response = await apiFetch(`/api/admin/reports/export?${new URLSearchParams(params)}`);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || `Export failed (${response.status}).`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "alrm_requests_export.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}
