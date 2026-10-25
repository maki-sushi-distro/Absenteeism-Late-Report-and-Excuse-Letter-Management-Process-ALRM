import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { ErrorState } from "@/components/common/ErrorState";
import LoadingSkeleton from "@/components/loading/LoadingSkeleton";
import PageBreadcrumbs from "@/components/navigation/PageBreadcrumbs";
import { instructorRows, requestClass, requestStudent } from "./programHeadData";
import { useProgramHeadRecords } from "./useProgramHeadRecords";
import { TEXT_INPUT_MAX_LENGTH } from "@/lib/inputLimits";

const panel = "overflow-x-auto rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

function InstructorTable({ rows }) {
  return <div className={panel}><table className="w-full min-w-[660px] text-left text-sm"><thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-4 py-3">Instructor</th><th className="px-4 py-3">Subject / section</th><th className="px-4 py-3">Absence requests</th><th className="px-4 py-3">Late requests</th><th className="px-4 py-3"><span className="sr-only">Details</span></th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{rows.map((row) => <tr key={row.id}><td className="px-4 py-4 font-medium">{row.name}</td><td className="px-4 py-4 text-slate-600 dark:text-slate-300">{row.classes.map((item) => `${item.subject_name} ${item.section || ""}`).join(", ")}</td><td className="px-4 py-4">{row.absences}</td><td className="px-4 py-4">{row.lates}</td><td className="px-4 py-4"><Link className="inline-flex items-center gap-1 text-blue-800 hover:underline dark:text-blue-300" to={`/program-head/instructors/${encodeURIComponent(row.id)}`}>View <ArrowRight className="size-4" /></Link></td></tr>)}</tbody></table></div>;
}

export function ProgramHeadInstructors() {
  const { requests, errors, loading, refresh } = useProgramHeadRecords();
  const [search, setSearch] = useState("");
  const rows = instructorRows(requests).filter((row) => `${row.name} ${row.classes.map((item) => item.subject_name).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-5"><header><h1 className="text-2xl font-bold">Instructors</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Instructors associated with requests in your program</p></header>
    <label className="relative block max-w-sm"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><span className="sr-only">Search instructors</span><input maxLength={TEXT_INPUT_MAX_LENGTH} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search instructor or subject" className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-900" /></label>
    {errors.requests ? <ErrorState message={errors.requests} /> : null}{errors.requests ? <button onClick={refresh} className="text-sm text-blue-800 underline dark:text-blue-300">Retry</button> : null}
    {loading ? <LoadingSkeleton variant="table" columns={5} label="Loading instructors" /> : rows.length ? <InstructorTable rows={rows} /> : <p className="rounded-md border border-slate-200 p-5 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">{search ? "No instructors match your search." : "No instructor-linked requests are available yet. The backend does not provide a full instructor roster to program heads."}</p>}
    <p className="text-xs text-slate-500 dark:text-slate-400">Counts reflect submitted requests, not attendance records or the full class roster.</p>
  </div>;
}

function StudentRequestTable({ requests }) {
  const students = new Map();
  for (const request of requests) {
    const student = request.enrollment?.student;
    if (!student?.id) continue;
    if (!students.has(student.id)) students.set(student.id, { name: requestStudent(request), absences: 0, lates: 0 });
    if (request.type === "absence") students.get(student.id).absences += 1;
    if (request.type === "late") students.get(student.id).lates += 1;
  }
  return <div className={panel}><table className="w-full min-w-[500px] text-left text-sm"><thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Absence requests</th><th className="px-4 py-3">Late requests</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{[...students.entries()].map(([id, row]) => <tr key={id}><td className="px-4 py-3 font-medium">{row.name}</td><td className="px-4 py-3">{row.absences}</td><td className="px-4 py-3">{row.lates}</td></tr>)}</tbody></table></div>;
}

export function ProgramHeadInstructorDetail() {
  const { instructorId } = useParams();
  const { requests, errors, loading } = useProgramHeadRecords();
  const instructor = instructorRows(requests).find((row) => row.id === instructorId);
  const [classId, setClassId] = useState("");
  const selectedClass = classId || instructor?.classes[0]?.id;
  const visible = requests.filter((request) => requestClass(request)?.instructor?.id === instructorId && requestClass(request)?.id === selectedClass);
  return <div className="space-y-5"><PageBreadcrumbs items={[{ label: "Instructors", to: "/program-head/instructors" }, { label: instructor?.name || "Instructor Details" }]} />
    {errors.requests ? <ErrorState message={errors.requests} /> : null}
    {loading ? <LoadingSkeleton variant="profile" columns={3} label="Loading instructor" /> : instructor ? <><header><h1 className="text-2xl font-bold">{instructor.name}</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Student request activity by class</p></header><label className="block text-sm font-medium">Class <select value={selectedClass} onChange={(event) => setClassId(event.target.value)} className="ml-2 max-w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">{instructor.classes.map((item) => <option key={item.id} value={item.id}>{item.subject_name} · {item.section || "No section"}</option>)}</select></label><StudentRequestTable requests={visible} /><p className="text-xs text-slate-500 dark:text-slate-400">These are submitted requests, not complete attendance or threshold records.</p></> : <p className="text-sm text-slate-500">Instructor not found in program requests.</p>}
  </div>;
}
