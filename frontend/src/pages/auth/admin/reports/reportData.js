import { normalizeRequestStatus } from "../../../../lib/requestStatus.js";

const schoolDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" });
export const reportHeadings = ["Request ID", "Student", "Program", "Subject", "Instructor", "Type", "Start Date", "End Date", "Reason", "Status", "Reviewed By", "Date Reviewed", "Flagged (IR)"];
export const visibleReportHeadings = reportHeadings.filter(heading => heading !== "Request ID");

export function schoolWeek(now = new Date(), weeksAgo = 0) {
  const monday = new Date(`${schoolDay.format(now)}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7 - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  return { date_from: monday.toISOString().slice(0, 10), date_to: sunday.toISOString().slice(0, 10) };
}

export function normalizeReportRows(sheet) {
  const [headings, ...rows] = sheet || [];
  if (!["Request ID", "Student", "Program", "Type", "Start Date", "Status"].every(heading => headings?.includes(heading))) throw new Error("The server returned an unexpected report format.");
  return rows.filter(row => row.some(value => value != null && value !== "")).map(row => Object.fromEntries(headings.map((heading, index) => {
    const value = row[index] instanceof Date ? row[index].toISOString().slice(0, 10) : String(row[index] ?? "");
    return [heading, heading === "Status" ? normalizeRequestStatus(value) : value];
  })));
}

export function departmentWeekRows(programs, records, week) {
  const names = [...new Set([...programs.map(program => program.program_name || program.name).filter(Boolean), ...records.map(row => row.Program).filter(Boolean)])];
  const counts = new Map(names.map(name => [name, { absences: 0, lates: 0 }]));
  const counted = new Set();
  for (const row of records) {
    const day = row["Start Date"];
    if (counts.has(row.Program) && ["absence", "late"].includes(row.Type) && day >= week.date_from && day <= week.date_to && !counted.has(row["Request ID"])) {
      counts.get(row.Program)[row.Type === "late" ? "lates" : "absences"] += 1;
      counted.add(row["Request ID"]);
    }
  }
  return names.map(name => ({ name, ...counts.get(name) }));
}
