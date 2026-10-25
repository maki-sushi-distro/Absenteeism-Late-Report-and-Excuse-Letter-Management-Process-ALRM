import StatusBadge from "@/components/dashboard/StatusBadge";
import ClassRecordsTable from "../InstructorClassRecords/ClassRecordsTable";
import { dueDate, formatDate, occurrenceDate, submittedDate } from "./requestData";

const columns = [
  { label: "Student" },
  { label: "Date of Occurrence" },
  { label: "Type" },
  { label: "Submitted" },
  { label: "Date of Due" },
  { label: "Request" },
];

export default function RequestsTable({ records, onReview, caption = "Class requests" }) {
  return <ClassRecordsTable columns={columns} caption={caption} empty={!records.length && "No requests match these filters."}>
    {records.map(record => <tr key={record.id} className="hover:bg-slate-50">
      <td className="break-words px-3 py-3"><button type="button" onClick={() => onReview(record)} aria-label={`Review request for ${record.enrollment?.student?.name || "student"}`} className="max-w-full break-words text-left font-medium text-[#203B82] underline-offset-4 hover:underline focus-visible:outline-blue-600">{record.enrollment?.student?.name || "Name unavailable"}</button></td>
      <td className="px-3 py-3">{formatDate(occurrenceDate(record))}</td>
      <td className="px-3 py-3">{record.type === "absence" ? "Absent" : "Late"}</td>
      <td className="px-3 py-3">{formatDate(submittedDate(record))}</td>
      <td className="px-3 py-3 text-sm font-normal text-slate-950">{formatDate(dueDate(record))}</td>
      <td className="px-3 py-3"><StatusBadge value={record.status} /></td>
    </tr>)}
  </ClassRecordsTable>;
}
