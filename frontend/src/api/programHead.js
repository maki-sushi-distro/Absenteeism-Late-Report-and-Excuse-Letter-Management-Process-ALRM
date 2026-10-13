import { apiRequest, buildQuery } from "./client.js";

export function getProgramHeadDashboard() {
  return apiRequest("/program-head/dashboard");
}

export function getFlaggedStudents(filters = {}) {
  return apiRequest(`/program-head/students/flagged${buildQuery(filters)}`);
}

export function getProgramHeadRequests(filters = {}) {
  return apiRequest(`/program-head/requests${buildQuery(filters)}`);
}
