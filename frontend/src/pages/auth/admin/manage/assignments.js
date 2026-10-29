export function assignmentSelection(row, instructors = []) {
  return {
    subject: row?.subject_name || "",
    classId: row?.id || "",
    instructorId: instructors.some(user => user.id === row?.instructor_id && user.role === "instructor" && user.status === "approved")
      ? row.instructor_id : "",
  };
}

export function changeAssignmentSelection(selection, field, value) {
  const next = { ...selection, [field]: value };
  if (field === "subject") next.classId = "";
  return next;
}

export function selectedAssignmentClass(classes, selection) {
  return classes.find(row => row.id === selection.classId
    && row.subject_name === selection.subject);
}

export function validateAssignment(classes, instructors, selection) {
  const row = selectedAssignmentClass(classes, selection);
  if (!row) throw new Error("Select an existing class for the chosen subject.");
  if (!instructors.some(user => user.id === selection.instructorId && user.role === "instructor" && user.status === "approved")) {
    throw new Error("Select an approved instructor.");
  }
  return { classId: row.id, instructorId: selection.instructorId };
}
