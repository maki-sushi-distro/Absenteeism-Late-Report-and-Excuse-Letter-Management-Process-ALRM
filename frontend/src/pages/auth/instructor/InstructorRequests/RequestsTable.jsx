import { Fragment } from "react";
import ClassRecordsTable from "../InstructorClassRecords/ClassRecordsTable";
import { formatDate, groupRequestsByMonth, occurrenceDate, requestCourse } from "./requestData";

const columns = type => [
  { label: "Student" },
  { label: "Subject" },
  { label: "Date" },
  { label: type === "absence" ? "Number of Absences" : "Minutes Late" },
  { label: "Threshold" },
  { label: "Action" },
];

const alertClass = { preventive: "bg-amber-50", critical: "bg-orange-50", "drop-limit": "bg-red-50" };

export default function RequestsTable({ records, attendance = new Map(), type = "absence", onReview, caption = "Class requests" }) {
  const tableColumns = columns(type);
  return <ClassRecordsTable columns={tableColumns} caption={caption} empty={!records.length && "No requests match these filters."}>
    {groupRequestsByMonth(records).map(group => <Fragment key={group.key}>
      <tr><th scope="rowgroup" colSpan={tableColumns.length} className="bg-slate-100 px-3 py-2 text-left text-sm font-bold text-[#203B82]">{group.label}</th></tr>
      {group.records.map(record => {
        const alert = attendance.get(record.id);
        const hasAlert = alert?.percentage != null && alert?.label;
        return <tr key={record.id} aria-label={hasAlert ? `Alert level: ${alert.label}` : undefined} className={`${hasAlert ? alertClass[alert.level] || "" : ""} hover:bg-slate-50`}>
      <td className="break-words px-3 py-3">{record.enrollment?.student?.name || "Name unavailable"}</td>
      <td className="break-words px-3 py-3">{requestCourse(record)?.subject_name || "Unavailable"}</td>
      <td className="px-3 py-3">{formatDate(occurrenceDate(record))}</td>
      <td className="px-3 py-3">{type === "absence" ? alert?.absences ?? "—" : record.minutes_late ?? "—"}</td>
      <td className="px-3 py-3">{hasAlert ? <span>{alert.percentage}% · {alert.label}</span> : "Unavailable"}</td>
      <td className="px-3 py-3"><button type="button" onClick={() => onReview(record)} aria-label={`View request for ${record.enrollment?.student?.name || "student"}`} className="inline-flex min-h-8 w-24 items-center justify-center rounded-[4px] bg-[#203B82] px-3 text-xs font-semibold text-white hover:bg-[#172B63] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">View</button></td>
    </tr>;})}
    </Fragment>)}
  </ClassRecordsTable>;
}
