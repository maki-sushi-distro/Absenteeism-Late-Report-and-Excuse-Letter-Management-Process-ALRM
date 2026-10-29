export function assignmentSelection(row, instructors = []) {
  const instructor = instructors.find(user => user.id === row?.instructor_id && user.role === "instructor" && user.status === "approved");
  return {
    classId: row?.id || "",
    instructorId: instructor?.id || "",
    instructorName: instructor?.name || "",
    programId: row?.program_id || "",
    yearLevel: row?.year_level || "",
    semester: row?.semester || "",
  };
}

export function changeAssignmentSelection(selection, field, value) {
  const next = { ...selection, [field]: value };
  if (field === "programId") {
    next.yearLevel = "";
    next.semester = "";
    next.classId = "";
  } else if (field === "yearLevel") {
    next.semester = "";
    next.classId = "";
  } else if (field === "semester") {
    next.classId = "";
  }
  return next;
}

export function selectedAssignmentClass(classes, selection) {
  return classes.find(row => row.id === selection.classId
    && row.program_id === selection.programId
    && row.year_level === selection.yearLevel
    && row.semester === selection.semester);
}

export function validateAssignment(classes, instructors, selection) {
  const row = selectedAssignmentClass(classes, selection);
  if (!row) throw new Error("Select an available class for the chosen program, year level, and semester.");
  if (!instructors.some(user => user.id === selection.instructorId && user.role === "instructor" && user.status === "approved")) {
    throw new Error("Select an approved instructor.");
  }
  return { classId: row.id, instructorId: selection.instructorId };
}
