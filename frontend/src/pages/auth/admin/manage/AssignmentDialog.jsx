import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { getClassPendingRequests, submitAssignmentAction } from "@/api/adminAssignments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getSelectablePrograms } from "@/lib/programs";
import PendingRequestsList from "./PendingRequestsList";
import { activeTeachingAssignment, assignedInstructor, assignmentRevision, assignmentSelection, changeAssignmentSelection, classLabel, editOperations, pendingRequestCount } from "./assignments.js";

const selectStyle = "h-10 w-full rounded-lg border border-[#172f6b]/60 bg-white px-4 text-sm text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#284fac] disabled:bg-slate-100 disabled:opacity-70";
const assignReason = "Instructor assigned by administrator.";

export default function AssignmentDialog({ row, data, onClose, onConflict, onSaved }) {
  const dialog = useRef(null);
  const lock = useRef(false);
  const [selection, setSelection] = useState(() => assignmentSelection(row));
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState({});
  const [pendingErrors, setPendingErrors] = useState({});

  const operation = selection.operation;
  const selectingSource = operation === "assign" && !row;
  const needsTarget = ["change_subject", "swap"].includes(operation);
  const sourceClass = row || (selectingSource ? data.classes.find(item => String(item.id) === selection.targetClassId) : null);
  const targetClass = needsTarget ? data.classes.find(item => String(item.id) === selection.targetClassId) : null;
  const sourceInstructor = assignedInstructor(sourceClass, data.instructors);
  const targetInstructor = assignedInstructor(targetClass, data.instructors);

  const candidates = data.classes.filter(item => {
    if (String(item.id) === String(sourceClass?.id)) return false;
    const assigned = Boolean(activeTeachingAssignment(item));
    if (selectingSource || operation === "change_subject") return !assigned;
    if (operation === "swap") return assigned && item.semester === sourceClass?.semester && item.school_year === sourceClass?.school_year;
    return false;
  });
  const programIds = new Set(candidates.map(item => String(item.program_id)));
  const programs = getSelectablePrograms(data.programs.filter(program => programIds.has(String(program.id))));
  const yearLevels = ["1st", "2nd", "3rd", "4th"].filter(year => candidates.some(item => String(item.program_id) === selection.programId && item.year_level === year));
  const semesters = ["1st", "2nd"].filter(semester => candidates.some(item => String(item.program_id) === selection.programId && item.year_level === selection.yearLevel && item.semester === semester));
  const availableClasses = candidates.filter(item => String(item.program_id) === selection.programId && item.year_level === selection.yearLevel && item.semester === selection.semester);

  function pendingState(classRow) {
    if (!classRow) return { count: 0, loading: false, requests: [] };
    const id = String(classRow.id);
    const loaded = Object.hasOwn(pending, id);
    const requests = pending[id] || [];
    return { count: loaded ? requests.length : pendingRequestCount(classRow), loading: !loaded && pendingRequestCount(classRow) > 0, requests };
  }
  const sourcePending = pendingState(sourceClass);
  const targetPending = pendingState(targetClass);
  const blocked = sourcePending.count > 0 || targetPending.count > 0 || sourcePending.loading || targetPending.loading || Boolean(pendingErrors[sourceClass?.id] || pendingErrors[targetClass?.id]);
  const currentInstructorId = String(sourceInstructor?.id || activeTeachingAssignment(sourceClass)?.instructor_id || "");
  const validSelection = Boolean(sourceClass && assignmentRevision(sourceClass) !== null && (operation === "assign" || selection.reason.trim()))
    && (["assign", "change_instructor"].includes(operation)
      ? Boolean(selection.instructorId) && (operation !== "change_instructor" || selection.instructorId !== currentInstructorId)
      : Boolean(targetClass && assignmentRevision(targetClass) !== null));

  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
    return () => { if (element.open) element.close(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const rows = [sourceClass, targetClass].filter(item => item && pendingRequestCount(item) > 0);
    rows.forEach(item => {
      getClassPendingRequests(item.id, { signal: controller.signal }).then(requests => {
        if (!controller.signal.aborted) setPending(current => ({ ...current, [item.id]: requests }));
      }).catch(issue => {
        if (!controller.signal.aborted) setPendingErrors(current => ({ ...current, [item.id]: issue.message || "Pending requests could not be loaded." }));
      });
    });
    return () => controller.abort();
  }, [sourceClass, targetClass]);

  function change(field, value) {
    setSelection(previous => changeAssignmentSelection(previous, field, value));
    setReviewing(false);
    setError("");
  }

  async function refreshPending(rows) {
    const results = await Promise.all(rows.filter(Boolean).map(async item => [item.id, await getClassPendingRequests(item.id)]));
    setPending(current => ({ ...current, ...Object.fromEntries(results) }));
    return results;
  }

  function payload() {
    const base = { action: operation, expected_revision: assignmentRevision(sourceClass), reason: operation === "assign" ? assignReason : selection.reason };
    if (["assign", "change_instructor"].includes(operation)) return { ...base, instructor_id: selection.instructorId };
    return { ...base, target_class_id: targetClass.id, target_expected_revision: assignmentRevision(targetClass) };
  }

  async function submit(event) {
    event.preventDefault();
    if (!validSelection || blocked || lock.current) return;
    if (!reviewing) { setReviewing(true); return; }
    lock.current = true;
    setBusy(true);
    setError("");
    const affected = [sourceClass.id, ...(targetClass ? [targetClass.id] : [])];
    try {
      await submitAssignmentAction(sourceClass.id, payload());
      await onSaved(affected, operation === "assign" ? "Instructor assigned." : "Instructor assignment updated.");
    } catch (failure) {
      if (failure.status === 409) {
        await onConflict(affected);
        const refreshed = await refreshPending([sourceClass, targetClass]).catch(() => []);
        const hasPending = refreshed.some(([, requests]) => requests.length > 0);
        setError(hasPending ? "New pending requests must be resolved before this assignment can change." : "This assignment changed while you were editing. Please review the updated details and confirm again.");
        setReviewing(false);
      } else {
        const messages = Object.values(failure.errors || {}).flat().filter(value => typeof value === "string");
        setError(messages.join(" ") || failure.message || "The assignment could not be saved.");
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const preview = operation === "change_instructor"
    ? [`${classLabel(sourceClass)}: ${sourceInstructor?.name || "Unassigned"} → ${data.instructors.find(item => String(item.id) === selection.instructorId)?.name || "New instructor"}`]
    : operation === "change_subject"
      ? [`${sourceInstructor?.name || "Instructor"}: ${classLabel(sourceClass)} → ${classLabel(targetClass)}`]
      : operation === "swap"
        ? [`${sourceInstructor?.name || "Instructor A"}: ${classLabel(sourceClass)} → ${classLabel(targetClass)}`, `${targetInstructor?.name || "Instructor B"}: ${classLabel(targetClass)} → ${classLabel(sourceClass)}`]
        : [`${classLabel(sourceClass)}: Unassigned → ${data.instructors.find(item => String(item.id) === selection.instructorId)?.name || "New instructor"}`];

  return <dialog ref={dialog} aria-labelledby="assignment-dialog-title" onCancel={event => { event.preventDefault(); if (!lock.current) onClose(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-[620px] overflow-y-auto rounded-[20px] border border-[#827979] bg-white p-0 text-slate-950 shadow-xl backdrop:bg-black/30">
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
      <h2 id="assignment-dialog-title" className="text-lg font-semibold">{row && activeTeachingAssignment(row) ? "Edit Instructor Assignment" : "Assign Instructor"}</h2>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Close assignment dialog" disabled={busy} onClick={onClose}><X className="size-5" /></Button>
    </div>
    <form onSubmit={submit} aria-busy={busy} className="grid gap-5 px-6 py-6">
      {sourceClass && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"><p className="font-semibold">Source class</p><p className="mt-1">{classLabel(sourceClass)} · {sourceClass.semester || "—"} Semester · A.Y. {sourceClass.school_year || "—"}</p><p className="mt-1 text-slate-600">Current instructor: {sourceInstructor?.name || "Unassigned"}</p></div>}

      {row && activeTeachingAssignment(row) && <fieldset disabled={busy} className="grid gap-2"><legend className="text-sm font-semibold">Operation</legend><div className="grid gap-2 sm:grid-cols-3">{editOperations.map(item => <label key={item.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm has-checked:border-[#284fac] has-checked:bg-blue-50"><input type="radio" name="assignment-operation" value={item.value} checked={operation === item.value} onChange={() => change("operation", item.value)} />{item.label}</label>)}</div></fieldset>}

      {["assign", "change_instructor"].includes(operation) && <div className="grid gap-1.5"><Label htmlFor="assignment-instructor">Instructor</Label><select id="assignment-instructor" required value={selection.instructorId} disabled={busy} onChange={event => change("instructorId", event.target.value)} className={selectStyle}><option value="">Select Instructor</option>{data.instructors.filter(item => operation !== "change_instructor" || String(item.id) !== currentInstructorId).map(item => <option key={item.id} value={item.id}>{item.name || item.email}</option>)}</select></div>}

      {(selectingSource || needsTarget) && <fieldset disabled={busy} className="grid gap-5"><div className="grid gap-1.5"><Label htmlFor="assignment-program">Program</Label><select id="assignment-program" value={selection.programId} onChange={event => change("programId", event.target.value)} className={selectStyle}><option value="">Select Program</option>{programs.map(program => <option key={program.id} value={program.id}>{program.program_name || program.name}</option>)}</select></div><div className="grid gap-4 min-[480px]:grid-cols-2"><div className="grid gap-1.5"><Label htmlFor="assignment-year">Year Level</Label><select id="assignment-year" value={selection.yearLevel} disabled={!selection.programId} onChange={event => change("yearLevel", event.target.value)} className={selectStyle}><option value="">Select Year Level</option>{yearLevels.map(year => <option key={year} value={year}>{year} Year</option>)}</select></div><div className="grid gap-1.5"><Label htmlFor="assignment-semester">Semester</Label><select id="assignment-semester" value={selection.semester} disabled={!selection.yearLevel} onChange={event => change("semester", event.target.value)} className={selectStyle}><option value="">Select Semester</option>{semesters.map(semester => <option key={semester} value={semester}>{semester} Semester</option>)}</select></div></div><div className="grid gap-1.5"><Label htmlFor="assignment-class">Available Class</Label><select id="assignment-class" value={selection.targetClassId} disabled={!selection.semester} onChange={event => change("targetClassId", event.target.value)} className={selectStyle}><option value="">Select Available Class</option>{availableClasses.map(item => <option key={item.id} value={item.id}>{classLabel(item)}</option>)}</select></div></fieldset>}

      {operation !== "assign" && <div className="grid gap-1.5"><Label htmlFor="assignment-reason">Reason</Label><textarea id="assignment-reason" required rows={3} value={selection.reason} disabled={busy} onChange={event => change("reason", event.target.value)} className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#284fac]" /></div>}
      <PendingRequestsList classRow={sourceClass} count={sourcePending.count} requests={sourcePending.requests} loading={sourcePending.loading} error={pendingErrors[sourceClass?.id]} />
      <PendingRequestsList classRow={targetClass} count={targetPending.count} requests={targetPending.requests} loading={targetPending.loading} error={pendingErrors[targetClass?.id]} />
      {reviewing && <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm"><h3 className="font-semibold text-[#172f6b]">Before / After preview</h3><ul className="mt-2 space-y-1">{preview.map(line => <li key={line}>{line}</li>)}</ul></section>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy || blocked || !validSelection} className="bg-[#284fac] text-white hover:bg-[#203f8a]">{busy && <LoaderCircle className="size-4 animate-spin" />}{busy ? "Saving…" : reviewing ? "Confirm change" : "Review changes"}</Button></div>
    </form>
  </dialog>;
}
