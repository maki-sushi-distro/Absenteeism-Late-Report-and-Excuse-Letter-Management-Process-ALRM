import RecordTypeTabs from "@/components/records/RecordTypeTabs";
import { ATTENDANCE_POLICY } from "./attendancePolicy";
import ClassRecordsTable from "./ClassRecordsTable";
import { studentsForType } from "./recordData";

const columns = [
  { label: "Name", width: "40%" },
  { label: "Absences", width: "20%", description: "Submitted absence reports, including pending and excused reports" },
  { label: "Lates", width: "20%", description: "Submitted late reports, including pending and excused reports" },
  { label: "Threshold", width: "20%", description: `Backend attendance units as a percentage of semester class hours (${ATTENDANCE_POLICY.absenceLimitRate * 100}% limit); three invalid lates add one hour` },
];

export default function CourseStudents({ course, type, onTypeChange }) {
  const students = studentsForType(course, type);
  return <RecordTypeTabs value={type} onValueChange={onTypeChange}>
    <ClassRecordsTable columns={columns} caption={`${course.subjectName}: submitted ${type === "late" ? "late" : "absence"} reports`} empty={!students.length && `No students with submitted ${type === "late" ? "late" : "absence"} reports in this class.`}>
      {students.map((student, index) => <tr key={student.id} className="hover:bg-slate-50">
        <td className="break-words px-3 py-3">{index + 1}. {student.name}</td>
        <td className="px-3 py-3">{student.absences}</td>
        <td className="px-3 py-3">{student.lates}</td>
        <td className="px-3 py-3">{student.threshold == null ? <span className="text-xs text-slate-500">Unavailable</span> : `${student.threshold}%`}</td>
      </tr>)}
    </ClassRecordsTable>
  </RecordTypeTabs>;
}
