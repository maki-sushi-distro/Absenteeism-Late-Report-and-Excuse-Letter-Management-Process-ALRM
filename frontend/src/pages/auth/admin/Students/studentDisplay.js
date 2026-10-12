function valueFrom(item, keys, fallback = "") {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], item);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

export const studentDisplayId = (student) => valueFrom(student,
  ["school_student_id", "studentId", "display_id", "displayId"], "Unassigned");
export const studentRecordId = (student) => valueFrom(student, ["id", "user_id", "userId"], "");
export const programRecordId = (program) => valueFrom(program, ["id", "program_id", "programId"], "");
export const programLabel = (program) => valueFrom(program,
  ["program_name", "programName", "name"], "Unnamed Program");
export const studentYear = (student) => valueFrom(student,
  ["year_level", "yearLevel", "year_section", "yearSection"], "Unassigned");

export function studentProgram(student, programs = []) {
  const matched = programs.find((program) => String(programRecordId(program)) === String(student?.program_id));
  return matched ? programLabel(matched) : valueFrom(student,
    ["program_name", "programName", "program.program_name", "program.name"], "Unassigned");
}
