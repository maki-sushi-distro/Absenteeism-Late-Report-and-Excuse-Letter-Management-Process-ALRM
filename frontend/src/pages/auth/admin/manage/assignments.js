export const editOperations = [
  { value: "change_instructor", label: "Change instructor" },
  { value: "change_subject", label: "Change subject/class" },
  { value: "swap", label: "Swap instructors" },
];

export function activeTeachingAssignment(row) {
  if (!row) return null;
  if (Object.hasOwn(row, "active_teaching_assignment")) return row.active_teaching_assignment;
  if (!row.instructor && !row.instructor_id) return null;
  return { instructor_id: row.instructor_id || row.instructor?.id, instructor: row.instructor || null };
}

export function assignedInstructor(row, instructors = []) {
  const assignment = activeTeachingAssignment(row);
  if (!assignment) return null;
  const embedded = assignment.instructor || assignment.user || assignment.assigned_instructor;
  const id = assignment.instructor_id || embedded?.id || row?.instructor_id;
  return embedded || instructors.find(item => String(item.id) === String(id)) || (id ? { id, name: assignment.instructor_name } : null);
}

export function classLabel(row) {
  if (!row) return "Class unavailable";
  return [row.subject_name || "Subject unavailable", row.section && `Section ${row.section}`].filter(Boolean).join(" — ");
}

export function assignmentSelection(source = null) {
  return {
    operation: source && activeTeachingAssignment(source) ? "change_instructor" : "assign",
    sourceClassId: source?.id || "",
    instructorId: "",
    programId: "",
    yearLevel: "",
    semester: "",
    targetClassId: "",
    reason: "",
  };
}

export function changeAssignmentSelection(selection, field, value) {
  if (field === "operation") return { ...assignmentSelection(), operation: value, sourceClassId: selection.sourceClassId, reason: selection.reason };
  const next = { ...selection, [field]: value };
  if (field === "programId") {
    next.yearLevel = "";
    next.semester = "";
    next.targetClassId = "";
  } else if (field === "yearLevel") {
    next.semester = "";
    next.targetClassId = "";
  } else if (field === "semester") {
    next.targetClassId = "";
  }
  return next;
}

export function assignmentRevision(row) {
  const revision = Number(row?.assignment_revision);
  return Number.isInteger(revision) && revision >= 0 ? revision : null;
}

export function pendingRequestCount(row) {
  const count = Number(row?.pending_requests_count || 0);
  return Number.isInteger(count) && count > 0 ? count : 0;
}
