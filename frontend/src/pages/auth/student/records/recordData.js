import { requestReason } from "../request-form/buildPayload.js";
import { historicalInstructorName, historicalRequestClass } from "../../../../lib/requestHistory.js";
import { requestStatusLabel } from "../../../../lib/requestStatus.js";
import { groupByManilaMonth } from "../../../../lib/manilaDate.js";

export function subjectOf(record) {
  return historicalRequestClass(record)?.subject_name || record.subjects_missed || "Unknown subject";
}

export function typeOf(record) {
  return record.type === "absence" ? "Absent" : record.type === "late" ? "Late" : "Unknown";
}

export function recordDate(record) {
  return record.start_date_of_absence || record.date_submitted || record.created_at;
}

export const instructorOf = (record) => historicalInstructorName(record);

export const groupRecordsByMonth = (records) => groupByManilaMonth(records, recordDate);

export function reviewStatus(value) {
  return requestStatusLabel(value);
}

export function reasonOf(record) {
  return requestReason(record) || "No reason provided.";
}

export function filterRecords(records, type, search = "", subject = "") {
  const query = search.trim().toLowerCase();
  return records.filter((record) => {
    const name = subjectOf(record);
    return (type === "all" || record.type === type) && (!subject || name === subject)
      && (!query || `${name} ${reviewStatus(record.status)} ${typeOf(record)} ${reasonOf(record)}`.toLowerCase().includes(query));
  }).sort((a, b) => String(recordDate(b) || "").localeCompare(String(recordDate(a) || "")));
}
