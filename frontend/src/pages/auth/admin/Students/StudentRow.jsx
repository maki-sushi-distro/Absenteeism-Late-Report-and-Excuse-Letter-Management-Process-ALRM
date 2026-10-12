import { TableCell, TableRow } from "@/components/ui/table";
import { studentDisplayId, studentProgram, studentRecordId, studentYear } from "./studentDisplay";

function StudentRow({ student, index, programs, onOpenStudent }) {
  const recordId = studentRecordId(student);
  function open() { if (recordId) onOpenStudent(recordId); }

  return <TableRow onClick={open} tabIndex={0}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    }}
    className={`border-[#c5cde0] hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${recordId ? "cursor-pointer" : "cursor-default"}`}>
    <TableCell className="px-0 py-5 text-sm font-semibold text-slate-950">{index + 1}. {student.name || "Unnamed Student"}</TableCell>
    <TableCell className="px-0 py-5 text-sm font-medium text-slate-950">{studentDisplayId(student)}</TableCell>
    <TableCell className="px-0 py-5 text-sm font-medium text-slate-950">{studentProgram(student, programs)}</TableCell>
    <TableCell className="px-0 py-5 text-sm font-medium text-slate-950">{studentYear(student)}</TableCell>
  </TableRow>;
}

export default StudentRow;
