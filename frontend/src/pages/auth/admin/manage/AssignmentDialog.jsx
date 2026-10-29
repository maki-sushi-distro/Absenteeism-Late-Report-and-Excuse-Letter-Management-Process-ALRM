import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { assignClassInstructor } from "@/api/adminAssignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { assignmentSelection, changeAssignmentSelection, instructorInputValue, selectedAssignmentClass, validateAssignment } from "./assignments.js";

const selectStyle = "mt-[5px] h-10 w-full rounded-lg border border-[#172f6b]/60 bg-white px-5 text-base text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#284fac] disabled:opacity-50";

export default function AssignmentDialog({ row, data, onClose, onAssigned }) {
  const dialog = useRef(null);
  const saving = useRef(false);
  const [selection, setSelection] = useState(() => assignmentSelection(row, data.instructors));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedClass = selectedAssignmentClass(data.classes, selection);
  const programIds = new Set(data.classes.map(item => item.program_id));
  const programs = data.programs.filter(program => programIds.has(program.id));
  const yearLevels = ["1st", "2nd", "3rd", "4th"].filter(year => data.classes.some(item => item.program_id === selection.programId && item.year_level === year));
  const availableClasses = data.classes.filter(item => item.program_id === selection.programId
    && item.year_level === selection.yearLevel
    && item.semester === selection.semester);
  const unchanged = selectedClass?.instructor_id === selection.instructorId;

  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
    return () => { if (element.open) element.close(); };
  }, []);

  function change(field, value) {
    setSelection(previous => changeAssignmentSelection(previous, field, value));
    setError("");
  }

  function changeInstructor(value) {
    const exact = data.instructors.find(instructor => instructorInputValue(instructor, data.instructors).toLowerCase() === value.trim().toLowerCase());
    setSelection(previous => ({ ...previous, instructorName: value, instructorId: exact?.id || "" }));
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    if (saving.current) return;
    setError("");
    try {
      const { classId, instructorId } = validateAssignment(data.classes, data.instructors, selection);
      if (unchanged) return;
      saving.current = true;
      setBusy(true);
      await assignClassInstructor(classId, instructorId);
      await onAssigned();
    } catch (failure) {
      const messages = Object.values(failure.errors || {}).flat().filter(value => typeof value === "string");
      setError(messages.join(" ") || failure.message || "The instructor could not be assigned. Try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <dialog ref={dialog} aria-labelledby="assignment-dialog-title" aria-describedby="assignment-dialog-description" onCancel={event => {
    event.preventDefault();
    if (!saving.current) onClose();
  }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-[522px] overflow-y-auto rounded-[20px] border border-[#827979] bg-white px-5 pb-7 pt-4 text-slate-950 shadow-xl backdrop:bg-black/30">
    <div className="mb-2.5 flex items-center justify-between gap-4">
      <h2 id="assignment-dialog-title" className="text-lg font-semibold">{row ? "Edit Instructor Assignment" : "Assign Instructor"}</h2>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Close assignment dialog" disabled={busy} onClick={onClose}><X className="size-5" aria-hidden="true" /></Button>
    </div>
    <p id="assignment-dialog-description" className="sr-only">Type an approved instructor name, then select a program, year level, semester, and matching available class.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy} className="grid gap-4">
        <div>
          <Label htmlFor="assignment-instructor" className="text-xs leading-[14px]">Instructor</Label>
          <Input id="assignment-instructor" list="approved-instructors" required autoComplete="off" value={selection.instructorName} disabled={!data.instructors.length} onChange={event => changeInstructor(event.target.value)} placeholder="Type instructor name" className={selectStyle} />
          <datalist id="approved-instructors">
            {data.instructors.map(instructor => <option key={instructor.id} value={instructorInputValue(instructor, data.instructors)}>{instructor.email || undefined}</option>)}
          </datalist>
        </div>
        <div>
          <Label htmlFor="assignment-program" className="text-xs leading-[14px]">Program</Label>
          <select id="assignment-program" required value={selection.programId} disabled={!selection.instructorId} onChange={event => change("programId", event.target.value)} className={selectStyle}>
            <option value="">Select Program</option>
            {programs.map(program => <option key={program.id} value={program.id}>{program.program_name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="assignment-year" className="text-xs leading-[14px]">Year Level</Label>
          <select id="assignment-year" required value={selection.yearLevel} disabled={!selection.programId} onChange={event => change("yearLevel", event.target.value)} className={selectStyle}>
            <option value="">Select Year Level</option>
            {yearLevels.map(year => <option key={year} value={year}>{year} Year</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="assignment-semester" className="text-xs leading-[14px]">Semester</Label>
          <select id="assignment-semester" required value={selection.semester} disabled={!selection.yearLevel} onChange={event => change("semester", event.target.value)} className={selectStyle}>
            <option value="">Select Semester</option>
            <option value="1st">1st Semester</option>
            <option value="2nd">2nd Semester</option>
          </select>
        </div>
        <div>
          <Label htmlFor="assignment-class" className="text-xs leading-[14px]">Available Class</Label>
          <select id="assignment-class" required value={selection.classId} disabled={!selection.semester} onChange={event => change("classId", event.target.value)} className={selectStyle}>
            <option value="">Select Available Class</option>
            {availableClasses.map(item => <option key={item.id} value={item.id}>{item.subject_name || "Subject unavailable"}{item.section ? ` · Section ${item.section}` : ""}</option>)}
          </select>
        </div>
      </fieldset>
      {!data.instructors.length && <p className="mt-3 text-sm text-slate-600">No approved instructors are available. Approve an instructor in User Management first.</p>}
      {selection.semester && !availableClasses.length && <p className="mt-3 text-sm text-slate-600">No classes match the selected program, year level, and semester.</p>}
      {unchanged && selection.instructorId && <p className="mt-3 text-sm text-slate-600">This instructor is already assigned. Choose another instructor to save a change.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-6">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose} className="h-[34px] rounded-lg border-[#827979] px-3 text-[13px] text-[#827979]">Cancel</Button>
        <Button type="submit" disabled={busy || !selectedClass || !selection.instructorId || unchanged} className="h-[34px] rounded-lg bg-[#284fac] px-3 text-[13px] text-white hover:bg-[#203f8a]">{busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}{busy ? "Assigning…" : row ? "Save" : "Assign"}</Button>
      </div>
    </form>
  </dialog>;
}
