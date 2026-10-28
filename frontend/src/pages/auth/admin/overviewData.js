function eventDate(value) { return value && Number.isFinite(Date.parse(value)) ? value : null; }
function newest(rows) { return rows.filter(row => eventDate(row.date)).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)); }
function requestInfo(request) {
  const course = request.enrollment?.class;
  const student = request.enrollment?.student;
  return { student: student?.name || "Unavailable", studentId: student?.school_student_id || "", email: student?.email || "", subject: course?.subject_name || request.subjects_missed || "Unavailable", classId: course?.id || "", type: request.type === "absence" ? "Absent" : request.type === "late" ? "Late" : "Unavailable", instructor: course?.instructor?.name || "Unavailable" };
}
export function requestActivity(requests = []) {
  return newest(requests.flatMap(request => {
    const info = requestInfo(request);
    const events = [{ ...info, id: `${request.id}-submitted`, date: request.date_submitted || request.created_at, action: "Submitted" }];
    const action = { approved: "Approved", noted: "Noted", invalid: "Denied" }[request.status];
    if (action && eventDate(request.date_reviewed)) events.push({ ...info, instructor: request.reviewer?.name || "Unavailable", id: `${request.id}-reviewed`, date: request.date_reviewed, action });
    if (eventDate(request.followupFlag?.flagged_date || request.followup_flag?.flagged_date)) {
      const flag = request.followupFlag || request.followup_flag;
      events.push({ ...info, id: `${request.id}-flagged`, date: flag.flagged_date, action: "Flagged" });
    }
    return events;
  }));
}
export function flagActivity(flags = [], classes = []) {
  const byId = new Map(classes.map(course => [course.id, course]));
  return newest(flags.map(flag => {
    const request = flag.request || {};
    const info = requestInfo(request);
    const instructor = request.enrollment?.class?.instructor?.name || byId.get(info.classId)?.instructor?.name || "Unavailable";
    return { ...info, id: flag.id, date: flag.flagged_date || flag.created_at, action: "Flagged", instructor, flaggedBy: instructor };
  }));
}
export function filterActivity(rows, { search = "", action = "", subject = "", date = "" } = {}) {
  const query = search.trim().toLowerCase();
  return rows.filter(row => (!query || [row.student, row.studentId, row.email, row.subject, row.instructor, row.type, row.action].some(value => String(value || "").toLowerCase().includes(query))) && (!action || row.action === action) && (!subject || row.classId === subject) && (!date || (() => {
    const time = new Date(row.date);
    const day = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, "0")}-${String(time.getDate()).padStart(2, "0")}`;
    return day === date;
  })()));
}
export function programOverviewRows(dashboard, classes = []) {
  return (dashboard?.programs_summary || []).map(program => ({
    id: program.id, name: program.program_name, students: program.student_count ?? null,
    instructors: new Set(classes.filter(course => course.program_id === program.id).map(course => course.instructor_id).filter(Boolean)).size,
    atRisk: program.at_risk_count ?? null, pending: program.pending_requests ?? null,
  }));
}
