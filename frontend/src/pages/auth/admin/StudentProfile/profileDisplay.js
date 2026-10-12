export function valueFrom(item, keys, fallback = "") {
  for (const key of keys) {
    const value = key.split(".").reduce((current, part) => current?.[part], item);
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
}

export function formatDate(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);
}

export const displayId = (student) => valueFrom(student,
  ["school_student_id", "studentId", "display_id", "displayId", "profile.school_student_id"], "Not recorded");
export const programName = (student) => valueFrom(student,
  ["program_name", "programName", "program.program_name", "program.name", "profile.program.program_name", "profile.program.name"], "Unassigned");
export const yearLevel = (student) => valueFrom(student,
  ["year_level", "yearLevel", "year_section", "yearSection", "section", "profile.year_level", "profile.yearLevel", "profile.section"], "Unassigned");
export const studentName = (student) => valueFrom(student, ["name", "full_name", "fullName", "user.name"], "Unnamed Student");
export const studentEmail = (student) => valueFrom(student, ["email", "user.email", "profile.email"], "Not recorded");
export const studentContact = (student) => valueFrom(student,
  ["contact_number", "contactNumber", "phone", "mobile_number", "profile.contact_number"], "Not recorded");

export function studentRequests(student) {
  const direct = valueFrom(student, ["requests", "excuse_requests", "excuseRequests", "absence_late_requests"], null);
  if (Array.isArray(direct)) return direct;
  return (Array.isArray(student?.enrollments) ? student.enrollments : []).flatMap((enrollment) => {
    const requests = enrollment?.requests || enrollment?.excuse_requests || enrollment?.excuseRequests || enrollment?.absence_late_requests || [];
    return (Array.isArray(requests) ? requests : []).map((request) => ({
      ...request, class: request.class || enrollment.class,
      class_name: request.class_name || request.className || valueFrom(enrollment, ["class.subject_name", "class.name"], ""),
    }));
  });
}

export function attendanceSummary(student) {
  const direct = valueFrom(student, ["attendance", "attendance_tracker", "attendanceTracker", "absence_summary"], null);
  if (direct) return direct;
  const enrollment = (Array.isArray(student?.enrollments) ? student.enrollments : []).find(
    (item) => item?.attendance_tracker || item?.attendanceTracker || item?.attendance);
  return enrollment?.attendance_tracker || enrollment?.attendanceTracker || enrollment?.attendance || null;
}

export const requestClass = (request) => valueFrom(request,
  ["class_name", "className", "subject_name", "subjectName", "class.subject_name", "class.name", "subject.name"], "Unassigned");
export const requestDate = (request) => valueFrom(request,
  ["date_absent_late", "dateAbsentLate", "start_date_of_absence", "startDateOfAbsence", "end_date_of_absence", "endDateOfAbsence", "late_date", "lateDate", "incident_date", "incidentDate", "date"], "");
export const requestSubmittedDate = (request) => valueFrom(request,
  ["date_submitted", "dateSubmitted", "created_at", "createdAt"], requestDate(request));
export const requestReason = (request) => valueFrom(request,
  ["reason", "reason_of_absence", "reasonOfAbsence", "description"], "No reason stated");
export const requestStatus = (request) => valueFrom(request,
  ["status", "approval_status", "approvalStatus", "request_status", "requestStatus"], "");

export function normalizeStatus(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "noted") return "valid";
  if (normalized === "accepted") return "approved";
  if (normalized === "rejected" || normalized === "declined") return "invalid";
  return normalized;
}

export function statusLabel(status) {
  const normalized = normalizeStatus(status);
  return ({ valid: "Valid", approved: "Approved", invalid: "Invalid", pending: "Pending" })[normalized] || status || "Unknown";
}

export function statusClassName(status) {
  const normalized = normalizeStatus(status);
  if (normalized === "approved") return "border-blue-200 bg-blue-50 text-blue-700";
  if (normalized === "valid") return "border-green-200 bg-green-50 text-green-700";
  if (normalized === "invalid") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}
