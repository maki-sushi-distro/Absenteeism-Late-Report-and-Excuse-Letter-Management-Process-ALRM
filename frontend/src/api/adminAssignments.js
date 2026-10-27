import { apiRequest } from "./client.js";
import { getCollection } from "./collections.js";

export async function getAdminAssignments({ signal } = {}) {
  const [classes, programs, users] = await Promise.all([
    getCollection("/api/admin/classes", { signal }),
    getCollection("/api/admin/programs", { signal }),
    getCollection("/api/admin/users?role=instructor&status=approved", { signal }),
  ]);
  return {
    classes, programs,
    instructors: users.filter(user => user.role === "instructor" && user.status === "approved"),
  };
}

export async function assignClassInstructor(classId, instructorId) {
  if (typeof classId !== "string" || !classId.trim()) throw new Error("Select an existing class.");
  if (typeof instructorId !== "string" || !instructorId.trim()) throw new Error("Select an approved instructor.");
  // Never resend program/year/section: assignment must preserve the class and its enrollment criteria.
  const updated = await apiRequest(`/admin/classes/${encodeURIComponent(classId)}`, {
    method: "PATCH",
    body: JSON.stringify({ instructor_id: instructorId }),
  });
  if (updated?.id !== classId || updated?.instructor_id !== instructorId) {
    throw new Error("The server did not confirm the instructor assignment. Reload the page before trying again.");
  }
  return updated;
}
