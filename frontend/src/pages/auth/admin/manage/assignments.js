export function assignmentSelection(row, instructors = []) {
  return {
    programId: row?.program_id || "",
    subject: row?.subject_name || "",
    classId: row?.id || "",
    instructorId: instructors.some(user => user.id === row?.instructor_id && user.role === "instructor" && user.status === "approved")
      ? row.instructor_id : "",
  };
}

export function changeAssignmentSelection(selection, field, value) {
  const next = { ...selection, [field]: value };
  if (field === "programId") Object.assign(next, { subject: "", classId: "", instructorId: "" });
  if (field === "subject") Object.assign(next, { classId: "", instructorId: "" });
  if (field === "classId") next.instructorId = "";
  return next;
}

export function selectedAssignmentClass(classes, selection) {
  return classes.find(row => row.id === selection.classId
    && row.program_id === selection.programId && row.subject_name === selection.subject);
}

export function validateAssignment(classes, instructors, selection) {
  const row = selectedAssignmentClass(classes, selection);
  if (!row) throw new Error("Select an existing class using Program, Subject and Section.");
  if (!instructors.some(user => user.id === selection.instructorId && user.role === "instructor" && user.status === "approved")) {
    throw new Error("Select an approved instructor.");
  }
  return { classId: row.id, instructorId: selection.instructorId };
}
