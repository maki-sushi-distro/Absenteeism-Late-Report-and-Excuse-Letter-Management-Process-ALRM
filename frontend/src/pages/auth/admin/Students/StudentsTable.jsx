import { UserRound } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { studentRecordId } from "./studentDisplay";
import StudentRow from "./StudentRow";

const headers = [{ label: "Name", width: "w-[26%]" }, { label: "ID", width: "w-[26%]" },
  { label: "Program", width: "w-[26%]" }, { label: "Year/Section", width: "w-[22%]" }];

function StudentsTable({ loading, onOpenStudent, programs, students }) {
  if (loading) return <div className="flex min-h-[260px] items-center justify-center rounded-[5px] border border-slate-200">
    <Spinner className="mr-2" /><span className="text-sm font-medium text-slate-600">Loading students...</span>
  </div>;

  if (students.length === 0) return <Empty className="min-h-[260px] rounded-[5px] border border-slate-200">
    <EmptyHeader><EmptyMedia variant="icon"><UserRound className="size-4" /></EmptyMedia>
      <EmptyTitle>No students found</EmptyTitle>
      <EmptyDescription>Try a different search term, program, or year filter.</EmptyDescription>
    </EmptyHeader>
  </Empty>;

  return <div className="overflow-x-auto"><Table className="min-w-[720px]">
    <TableHeader><TableRow className="border-[#b9c2dd] hover:bg-transparent">
      {headers.map((header) => <TableHead key={header.label} className={`${header.width} px-0 py-3 text-sm font-black text-[#203b82] dark:text-blue-200`}>{header.label}</TableHead>)}
    </TableRow></TableHeader>
    <TableBody>{students.map((student, index) => <StudentRow key={studentRecordId(student) || index}
      student={student} index={index} programs={programs} onOpenStudent={onOpenStudent} />)}</TableBody>
  </Table></div>;
}

export default StudentsTable;
