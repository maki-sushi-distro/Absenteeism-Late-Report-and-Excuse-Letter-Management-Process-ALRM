export const ATTENDANCE_POLICY = { warning: 2, incidentReport: 3, latesPerAbsence: 3 };

export function programShortName(name) {
  const normalized = String(name || "").replace(/^Bachelor of Science\s+/i, "BS ")
    .replace(/^Bachelor of Arts\s+/i, "BA ").replace(/^Associate in\s+/i, "A ");
  const match = normalized.match(/^(BS|BA|A)\s+(?:in\s+)?(.+)$/i);
  if (!match) return normalized;
  const initials = match[2].split(/\s+/).filter((word) => !["and", "in", "of"].includes(word.toLowerCase())).map((word) => word[0]).join("");
  return `${match[1]}${initials}`.toUpperCase();
}

export function studentProfile(user, classes = []) {
  const sections = [...new Set(classes.map((item) => item.section).filter(Boolean))];
  const terms = [...new Set(classes.filter((item) => item.semester && item.school_year)
    .map((item) => `${item.semester} Semester A.Y. ${item.school_year}`))];
  const year = user?.year_level ? `${user.year_level} Year` : "";
  return {
    name: user?.name || "Student",
    studentId: user?.school_student_id || "Not available",
    program: user?.program?.program_name || "Not assigned",
    academic: [user?.program?.program_name, year, sections.length ? `Section ${sections.join(", ")}` : ""].filter(Boolean).join(" - ") || "Not assigned",
    term: terms.join(" / "),
  };
}

export function attendanceStanding(attendance = []) {
  // Thresholds apply to each class, never to the sum across different classes.
  const highest = attendance.filter((item) => item.tracker != null).reduce((current, item) =>
    !current || Number(item.tracker.converted_absences || 0) > Number(current.tracker.converted_absences || 0) ? item : current, null);
  const converted = Number(highest?.tracker?.converted_absences || 0);
  const status = converted >= ATTENDANCE_POLICY.incidentReport ? "IR" : converted >= ATTENDANCE_POLICY.warning ? "warning" : "safe";
  return { converted, status, subject: highest?.subject_name || "", hasData: attendance.some((item) => item.tracker != null) };
}

export function requestTotals(requests = []) {
  const recorded = requests.filter((item) => item.status !== "cancelled");
  const absences = recorded.filter((item) => item.type === "absence");
  return {
    absences: absences.length,
    lates: recorded.filter((item) => item.type === "late").length,
    excused: absences.filter((item) => ["approved", "noted"].includes(item.status)).length,
    unexcused: absences.filter((item) => item.status === "invalid").length,
    pending: absences.filter((item) => item.status === "pending").length,
  };
}

export function recentRequestActivity(requests = [], limit = 5) {
  return requests.flatMap((item) => {
    const subject = item.enrollment?.class?.subject_name || item.subjects_missed || "your class";
    const label = `${item.type === "late" ? "Late report" : "Excuse letter"} #${String(item.id).slice(0, 8)} for ${subject}`;
    const events = [{ id: `${item.id}-submitted`, requestId: item.id, message: `${label} submitted.`, status: "pending", date: item.date_submitted || item.created_at }];
    if (["approved", "noted", "invalid"].includes(item.status) && item.date_reviewed) {
      const action = { approved: "approved", noted: "noted", invalid: "marked invalid" }[item.status];
      events.push({ id: `${item.id}-reviewed`, requestId: item.id, message: `${label} ${action}.`, status: item.status, date: item.date_reviewed });
    }
    return events;
  }).filter((event) => Number.isFinite(Date.parse(event.date)))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, limit);
}
