import { apiRequest } from "./client.js";
import { getCollection } from "./collections.js";

const actions = new Set(["assign", "change_instructor", "change_subject", "swap", "remove"]);

export async function getAdminAssignments({ signal } = {}) {
  const [classes, programs, users] = await Promise.all([
    getCollection("/api/admin/classes", { signal, perPage: 50 }),
    getCollection("/api/admin/programs", { signal }),
    getCollection("/api/admin/users?role=instructor&status=approved", { signal }),
  ]);
  return {
    classes, programs,
    instructors: users.filter(user => user.role === "instructor" && user.status === "approved"),
  };
}

export function getAdminClass(classId) {
  return apiRequest(`/api/admin/classes/${encodeURIComponent(classId)}`);
}

export function getClassPendingRequests(classId, options) {
  return getCollection(`/api/admin/classes/${encodeURIComponent(classId)}/pending-requests`, { ...options, perPage: 50 });
}

/**
 * @param {string} sourceClassId
 * @param {{action: "assign"|"change_instructor"|"change_subject"|"swap"|"remove", expected_revision: number, reason: string, instructor_id?: string, target_class_id?: string, target_expected_revision?: number}} payload
 */
export function submitAssignmentAction(sourceClassId, payload) {
  const sourceId = String(sourceClassId || "").trim();
  const action = payload?.action;
  const reason = String(payload?.reason || "").trim();
  const expectedRevision = Number(payload?.expected_revision);
  if (!sourceId) throw new Error("Select an existing source class.");
  if (!actions.has(action)) throw new Error("Select a valid assignment operation.");
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error("Refresh the class before changing its assignment.");
  if (!reason) throw new Error("Enter a reason for this assignment change.");

  const body = { action, expected_revision: expectedRevision, reason };
  if (["assign", "change_instructor"].includes(action)) {
    body.instructor_id = String(payload.instructor_id || "").trim();
    if (!body.instructor_id) throw new Error("Select an approved instructor.");
  }
  if (["change_subject", "swap"].includes(action)) {
    body.target_class_id = String(payload.target_class_id || "").trim();
    body.target_expected_revision = Number(payload.target_expected_revision);
    if (!body.target_class_id) throw new Error("Select a destination class.");
    if (!Number.isInteger(body.target_expected_revision) || body.target_expected_revision < 0) throw new Error("Refresh the destination class before continuing.");
  }
  return apiRequest(`/api/admin/classes/${encodeURIComponent(sourceId)}/assignment`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
