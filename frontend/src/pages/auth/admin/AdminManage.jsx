import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { UserRoundArrowLeft } from "lucide-react";
import { getAdminAssignments } from "@/api/adminAssignments";
import { deleteClass } from "@/api/admin";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import LoadingSkeleton from "@/components/loading/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AssignmentDialog from "./manage/AssignmentDialog";
import { isGeneralEducationProgram } from "@/lib/programs";

export default function AdminManage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [programId, setProgramId] = useState("");
  const [dialog, setDialog] = useState(null);
  const [removingClass, setRemovingClass] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [removalError, setRemovalError] = useState("");
  const removalLock = useRef(false);
  const mounted = useRef(false);

  const load = useCallback(signal => getAdminAssignments({ signal })
    .then(next => {
      if (mounted.current && !signal?.aborted) setData(next);
    }).catch(failure => {
      if (mounted.current && !signal?.aborted) {
        setData(null);
        setError(failure.message || "Assignments could not be loaded.");
      }
    }).finally(() => {
      if (mounted.current && !signal?.aborted) setLoading(false);
    }), []);

  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void load(controller.signal);
    return () => { mounted.current = false; controller.abort(); };
  }, [load]);

  const visiblePrograms = (data?.programs || []).filter(program => !isGeneralEducationProgram(program));
  const generalEducationIds = new Set((data?.programs || []).filter(isGeneralEducationProgram).map(program => program.id));
  const assignableClasses = (data?.classes || []).filter(row => !generalEducationIds.has(row.program_id) && !isGeneralEducationProgram(row.program));
  const rows = assignableClasses.filter(row => !programId || row.program_id === programId);

  function reload() {
    setLoading(true);
    setError("");
    return load();
  }

  async function assigned() {
    setNotice("Instructor assignment saved.");
    // Read the server's classes again; never synthesize an assignment row locally.
    await reload();
    setDialog(null);
  }

  async function removeClass() {
    if (!removingClass || removalLock.current) return;
    removalLock.current = true;
    setRemoving(true);
    setRemovalError("");
    setNotice("");
    try {
      await deleteClass(removingClass.id);
      if (!mounted.current) return;
      setRemovingClass(null);
      setNotice("Class removed.");
      await reload();
    } catch (failure) {
      if (mounted.current) setRemovalError(failure.message || "The class could not be removed.");
    } finally {
      removalLock.current = false;
      if (mounted.current) setRemoving(false);
    }
  }

  return <section aria-label="Instructor assignment management" className="space-y-5 font-sans">
    <h1 className="sr-only">Manage</h1>
    {loading ? <LoadingSkeleton variant="table" rows={5} columns={5} label="Loading instructor assignments">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-10 w-[260px] rounded-lg" />
        <div className="flex items-center gap-3"><Skeleton className="h-10 w-28 rounded-lg" /><Skeleton className="h-10 w-[170px] rounded-lg" /></div>
      </div>
    </LoadingSkeleton> : <>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <select aria-label="Filter by program" value={programId} disabled={loading || !data || removing} onChange={event => setProgramId(event.target.value)} className="h-10 w-[260px] rounded-lg border border-[#172f6b]/60 bg-white px-5 text-base text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#284fac] disabled:opacity-50">
        <option value="">Program</option>
        {visiblePrograms.map(program => <option key={program.id} value={program.id}>{program.program_name}</option>)}
      </select>
      <div className="flex flex-wrap items-center gap-3">
      <Link to="/classes" className="inline-flex h-10 items-center rounded-lg border border-[#172f6b]/60 px-3 text-[13px] font-medium text-[#172f6b] outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#284fac] dark:text-blue-200">Manage classes</Link>
      <Button type="button" disabled={removing || !assignableClasses.length} onClick={() => { setNotice(""); setDialog({ row: null }); }} className="h-10 w-[170px] rounded-lg bg-[#172f6b] text-[13px] text-white hover:bg-[#203f8a]">
        <UserRoundArrowLeft className="size-[18px]" aria-hidden="true" />Assign Instructor
      </Button>
      </div>
    </div>
    {notice && <p role="status" className="text-sm text-green-800 dark:text-green-300">{notice}</p>}
    {error ? <div role="alert" className="space-y-3"><ErrorState title="Unable to load assignments" message={error} /><Button type="button" variant="outline" onClick={reload}>Retry loading</Button></div>
        : !rows.length ? <EmptyState title="No instructor assignments" message={programId ? "No classes match this program. Choose another program to view its assignments." : "No classes are available. Create a class in Class Management before assigning an instructor."} />
          : <div className="px-2.5">
            <Table className="min-w-[850px] table-fixed text-base">
              <TableHeader><TableRow className="h-[60px] border-[#172f6b]/40 hover:bg-transparent">
                {["Instructor", "Subject", "Program", "Section", "Action"].map(title => <TableHead key={title} scope="col" className="w-1/5 px-2 py-3 font-bold text-[#172f6b] dark:text-blue-200">{title}</TableHead>)}
              </TableRow></TableHeader>
              <TableBody>
                {rows.map(row => <TableRow key={row.id} className="h-[70px] border-[#172f6b]/40 last:border-b!">
                  <TableCell className="whitespace-normal px-2 py-4 font-medium">{row.instructor?.name || data.instructors.find(instructor => instructor.id === row.instructor_id)?.name || "Instructor unavailable"}</TableCell>
                  <TableCell className="whitespace-normal px-2 py-4 font-medium">{row.subject_name || "Subject unavailable"}</TableCell>
                  <TableCell className="whitespace-normal px-2 py-4 font-medium">{row.program?.program_name || data.programs.find(program => program.id === row.program_id)?.program_name || "Program unavailable"}</TableCell>
                  <TableCell className="whitespace-normal px-2 py-4 font-medium">{row.section || "Section unavailable"}</TableCell>
                  <TableCell className="px-2 py-4"><div className="flex items-center gap-1">
                    <Button type="button" disabled={removing} aria-label={`Edit ${row.subject_name}, section ${row.section}`} onClick={() => { setNotice(""); setDialog({ row }); }} className="h-7 rounded-sm bg-[#284fac] px-2 text-sm text-white hover:bg-[#203f8a]">Edit</Button>
                    <Button type="button" size="sm" variant="destructive" disabled={removing} aria-label={`Remove class ${row.subject_name}, section ${row.section}`} onClick={() => { setRemovalError(""); setRemovingClass(row); }}>Remove</Button>
                  </div></TableCell>
                </TableRow>)}
              </TableBody>
            </Table>
          </div>}
    </>}
    {dialog && data && <AssignmentDialog row={dialog.row} data={{ ...data, classes: assignableClasses }} onClose={() => setDialog(null)} onAssigned={assigned} />}
    <AlertDialog open={Boolean(removingClass)} onOpenChange={open => { if (!open && !removalLock.current) setRemovingClass(null); }}>
      <AlertDialogContent aria-busy={removing} className="rounded-[20px] bg-white">
        <AlertDialogTitle>Remove class?</AlertDialogTitle>
        <AlertDialogDescription>This will delete {removingClass?.subject_name || "this class"}{removingClass?.section ? ` (section ${removingClass.section})` : ""}. Classes with enrolled students cannot be deleted.</AlertDialogDescription>
        {removalError && <p role="alert" className="text-sm text-red-700">{removalError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
          <Button type="button" disabled={removing} onClick={removeClass} className="rounded-lg bg-[#e44343] text-white hover:bg-red-600">{removing ? "Removing…" : "Remove class"}</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}
