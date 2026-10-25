import { getStudentAttendanceSummary, getStudentClasses, getStudentRequests } from "@/api/student";
import { useApiResource } from "@/hooks/useApiResource";

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isId = (value) => (typeof value === "string" && value.trim() !== "") || (typeof value === "number" && Number.isFinite(value));

async function loadList(load, label, valid) {
  const data = await load();
  if (!Array.isArray(data) || !data.every((item) => isRecord(item) && valid(item))) {
    throw new Error(`Your ${label} data is unavailable because the server returned an unexpected response.`);
  }
  return data;
}

function loadRequests() {
  return loadList(getStudentRequests, "request", (item) =>
    isId(item.id) && ["absence", "late"].includes(item.type) && typeof item.status === "string");
}

function loadAttendance() {
  return loadList(getStudentAttendanceSummary, "attendance", (item) => {
    if (!isId(item.class_id)) return false;
    if (item.tracker === null) return true;
    const converted = item.tracker?.converted_absences;
    return isRecord(item.tracker) && ["number", "string"].includes(typeof converted)
      && String(converted).trim() !== "" && Number.isFinite(Number(converted)) && Number(converted) >= 0;
  });
}

function loadClasses() {
  return loadList(getStudentClasses, "class", (item) => isId(item.class_id)
    && [item.section, item.semester, item.school_year].every((value) => value == null || typeof value === "string" || typeof value === "number"));
}

export default function useStudentDashboardResources(userId) {
  const requests = useApiResource(loadRequests, userId);
  const attendance = useApiResource(loadAttendance, userId);
  const classes = useApiResource(loadClasses, userId);
  return { requests, attendance, classes };
}
