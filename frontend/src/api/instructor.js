import { apiRequest } from "./client.js";

export function getInstructorDashboard() {
  return apiRequest("/instructor/dashboard");
}

export function getInstructorRequests() {
  return apiRequest("/instructor/requests");
}

export function decideRequest(requestId, status) {
  return apiRequest(`/instructor/requests/${requestId}/decision`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
