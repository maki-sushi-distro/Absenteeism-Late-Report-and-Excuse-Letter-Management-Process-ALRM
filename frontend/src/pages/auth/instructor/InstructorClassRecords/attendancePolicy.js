// Matches the semester-hours policy in the newer backend's config/alrm.php.
export const COURSE_ATTENDANCE_POLICY = { semesterWeeks: 16, absenceLimitRate: 0.2, latesPerAbsence: 3 };

export function requestAbsencePercentage(course, student) {
  if (course.weekly_hours == null || course.meetings_per_week == null || course.weekly_hours === "" || course.meetings_per_week === "") return null;
  const hours = Number(course.weekly_hours);
  const meetings = Number(course.meetings_per_week);
  if (!Number.isFinite(hours) || hours <= 0 || !Number.isFinite(meetings) || meetings < 0) return null;

  const converted = student.invalidAbsences + Math.floor(student.invalidLates / COURSE_ATTENDANCE_POLICY.latesPerAbsence);
  const usedHours = Math.round(converted * (hours / Math.max(1, meetings)) * 100) / 100;
  return Math.round(usedHours / (hours * COURSE_ATTENDANCE_POLICY.semesterWeeks) * 10000) / 100;
}
