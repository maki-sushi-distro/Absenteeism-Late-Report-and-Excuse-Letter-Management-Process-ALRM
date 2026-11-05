import { assignedInstructor } from "./assignments.js";

export function removeAssignmentDescription(row, instructors) {
  const instructor = assignedInstructor(row, instructors);
  const name = instructor?.first_name || instructor?.name || "The instructor";
  return `${name} will be removed from ${row.subject_name || "the class"} — ${row.section || "section unavailable"}. The class, enrolled students, and request history will remain. The class will become Unassigned.`;
}
