import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap, Search, UserRoundArrowLeft } from "lucide-react";
import { getAdminAssignments, getAdminClass } from "@/api/adminAssignments";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import FilterMenu, { RadioFilterGroup } from "@/components/common/FilterMenu";
import LoadingSkeleton from "@/components/loading/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSelectablePrograms, isGeneralEducationProgram } from "@/lib/programs";
import AssignmentDialog from "./manage/AssignmentDialog";
import RemoveAssignmentDialog from "./manage/RemoveAssignmentDialog";
import { activeTeachingAssignment, assignedInstructor, pendingRequestCount } from "./manage/assignments.js";

export default function AdminManage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [programId, setProgramId] = useState("");
  const [dialog, setDialog] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const mounted = useRef(false);

  const load = useCallback(signal => getAdminAssignments({ signal }).then(next => {
    if (mounted.current && !signal?.aborted) setData(next);
  }).catch(failure => {
    if (mounted.current && !signal?.aborted) { setData(null); setError(failure.message || "Assignments could not be loaded."); }
  }).finally(() => {
    if (mounted.current && !signal?.aborted) setLoading(false);
  }), []);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void load(controller.signal);
    return () => { mounted.current = false; controller.abort(); };
  }, [load]);

  const selectablePrograms = getSelectablePrograms(data?.programs || []);
  const generalEducationIds = new Set((data?.programs || []).filter(isGeneralEducationProgram).map(program => String(program.id)));
  const assignableClasses = (data?.classes || []).filter(row => !generalEducationIds.has(String(row.program_id)) && !isGeneralEducationProgram(row.program));
  const query = search.trim().toLowerCase();
  const rows = assignableClasses.map(row => {
    const instructor = assignedInstructor(row, data?.instructors || []);
    return { ...row, displayInstructor: instructor?.name || "Unassigned", displayProgram: row.program?.program_name || data?.programs.find(program => String(program.id) === String(row.program_id))?.program_name || "Program unavailable" };
  }).filter(row => (!programId || String(row.program_id) === String(programId)) && (!query || [row.displayInstructor, row.subject_name, row.displayProgram, row.section].some(value => String(value || "").toLowerCase().includes(query))));
  const selectedProgram = selectablePrograms.find(program => String(program.id) === String(programId));
  const unassignedCount = assignableClasses.filter(row => !activeTeachingAssignment(row)).length;
  const dialogRow = dialog?.classId ? assignableClasses.find(row => String(row.id) === String(dialog.classId)) : null;
  const removingRow = removingId ? assignableClasses.find(row => String(row.id) === String(removingId)) : null;

  function reload() { setLoading(true); setError(""); return load(); }

  async function refreshRows(ids) {
    const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
    const updated = await Promise.all(uniqueIds.map(getAdminClass));
    if (mounted.current) setData(current => current && ({ ...current, classes: current.classes.map(row => updated.find(item => String(item.id) === String(row.id)) || row) }));
    return updated;
  }

  async function saved(ids, message) {
    await refreshRows(ids);
    if (!mounted.current) return;
    setDialog(null);
    setRemovingId(null);
    setNotice(message);
  }

  return <section aria-label="Instructor assignment management" className="space-y-5 font-sans">
    <h1 className="sr-only">Manage</h1>
    {loading ? <LoadingSkeleton variant="table" rows={5} columns={5} label="Loading instructor assignments"><div className="flex flex-wrap items-center justify-between gap-4"><Skeleton className="h-10 w-[260px] rounded-lg" /><div className="flex items-center gap-3"><Skeleton className="h-10 w-28 rounded-lg" /><Skeleton className="h-10 w-[170px] rounded-lg" /></div></div></LoadingSkeleton> : <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2"><div className="relative min-w-0 max-w-[400px] flex-1 basis-64"><Input type="search" aria-label="Search instructor assignments" placeholder="Search Instructor, Subject, Program, Section..." value={search} onChange={event => setSearch(event.target.value)} className="h-10 rounded-[8px] border-slate-300 pr-9! shadow-sm" /><Search className="pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 text-slate-400" /></div><FilterMenu label="Filter instructor assignments" chips={programId ? [{ name: "program", label: `Program: ${selectedProgram?.program_name || selectedProgram?.name || "Selected program"}`, Icon: GraduationCap }] : []} onChange={(_, value) => setProgramId(value)}><RadioFilterGroup name="program" label="Program" value={programId} onChange={(_, value) => setProgramId(value)} options={[{ value: "", label: "All programs" }, ...selectablePrograms.map(program => ({ value: String(program.id), label: program.program_name || program.name || "Unnamed program" }))]} /></FilterMenu></div>
        <div className="flex flex-wrap items-center gap-3"><Link to="/classes" className="inline-flex h-10 items-center rounded-lg border border-[#172f6b]/60 px-3 text-[13px] font-medium text-[#172f6b] hover:bg-slate-50">Manage classes</Link><Button type="button" disabled={!unassignedCount} onClick={() => { setNotice(""); setDialog({ classId: null }); }} className="h-10 w-[170px] rounded-lg bg-[#172f6b] text-[13px] text-white hover:bg-[#203f8a]"><UserRoundArrowLeft className="size-[18px]" />Assign Instructor</Button></div>
      </div>
      {notice && <p role="status" className="fixed right-6 top-6 z-50 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 shadow-lg">{notice}</p>}
      {error ? <div role="alert" className="space-y-3"><ErrorState title="Unable to load assignments" message={error} /><Button type="button" variant="outline" onClick={reload}>Retry loading</Button></div> : !rows.length ? <EmptyState title="No instructor assignments" message={search || programId ? "No assignments match the current search and filters." : "No classes are available. Create a class in Class Management before assigning an instructor."} /> : <div className="px-2.5"><Table className="min-w-[850px] table-fixed text-base"><TableHeader><TableRow className="h-[60px] border-[#172f6b]/40 hover:bg-transparent">{["Instructor", "Subject", "Program", "Section", "Action"].map(title => <TableHead key={title} className="w-1/5 px-2 py-3 font-bold text-[#172f6b]">{title}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.map(row => {
        const assigned = Boolean(activeTeachingAssignment(row));
        const pending = pendingRequestCount(row);
        return <TableRow key={row.id} className="h-[70px] border-[#172f6b]/40 last:border-b!"><TableCell className="whitespace-normal px-2 py-4 font-medium">{row.displayInstructor}{pending > 0 && <span className="mt-1 block text-xs font-normal text-amber-700">{pending} pending {pending === 1 ? "request" : "requests"}</span>}</TableCell><TableCell className="whitespace-normal px-2 py-4 font-medium">{row.subject_name || "Subject unavailable"}</TableCell><TableCell className="whitespace-normal px-2 py-4 font-medium">{row.displayProgram}</TableCell><TableCell className="whitespace-normal px-2 py-4 font-medium">{row.section || "Section unavailable"}</TableCell><TableCell className="px-2 py-4"><div className="flex flex-wrap items-center gap-1">{assigned ? <><Button type="button" aria-label={`Edit ${row.subject_name}, section ${row.section}`} onClick={() => { setNotice(""); setDialog({ classId: row.id }); }} className="h-7 rounded-sm bg-[#284fac] px-2 text-sm text-white hover:bg-[#203f8a]">Edit</Button><Button type="button" size="sm" variant="destructive" aria-label={`Remove instructor assignment from ${row.subject_name}, section ${row.section}`} onClick={() => { setNotice(""); setRemovingId(row.id); }}>Remove</Button></> : <Button type="button" size="sm" onClick={() => { setNotice(""); setDialog({ classId: row.id }); }} className="bg-[#284fac] text-white hover:bg-[#203f8a]">Assign instructor</Button>}</div></TableCell></TableRow>;
      })}</TableBody></Table></div>}
    </>}
    {dialog && data && <AssignmentDialog row={dialogRow} data={{ ...data, classes: assignableClasses }} onClose={() => setDialog(null)} onConflict={refreshRows} onSaved={saved} />}
    {removingRow && data && <RemoveAssignmentDialog row={removingRow} instructors={data.instructors} onClose={() => setRemovingId(null)} onConflict={refreshRows} onSaved={saved} />}
  </section>;
}
