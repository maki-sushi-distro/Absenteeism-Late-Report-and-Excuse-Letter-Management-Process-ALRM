import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import { assignClassInstructor } from "@/api/adminAssignments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { assignmentSelection, changeAssignmentSelection, selectedAssignmentClass, validateAssignment } from "./assignments.js";

const selectStyle = "mt-[5px] h-10 w-full rounded-lg border border-[#172f6b]/60 bg-white px-5 text-base text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-[#284fac] disabled:opacity-50";

export default function AssignmentDialog({ row, programId, data, onClose, onAssigned }) {
  const dialog = useRef(null);
  const saving = useRef(false);
  const [selection, setSelection] = useState(() => row
    ? assignmentSelection(row, data.instructors)
    : { ...assignmentSelection(), programId });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selectedClass = selectedAssignmentClass(data.classes, selection);
  const subjects = [...new Set(data.classes.filter(item => item.program_id === selection.programId).map(item => item.subject_name))].filter(Boolean);
  const sections = data.classes.filter(item => item.program_id === selection.programId && item.subject_name === selection.subject);
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
  }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-[522px] overflow-y-auto border border-[#827979] bg-white px-5 pb-7 pt-4 text-slate-950 shadow-xl backdrop:bg-black/30">
    <div className="mb-2.5 flex items-center justify-between gap-4">
      <h2 id="assignment-dialog-title" className="text-lg font-semibold">{row ? "Edit Instructor Assignment" : "Assign Instructor"}</h2>
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Close assignment dialog" disabled={busy} onClick={onClose}><X className="size-5" aria-hidden="true" /></Button>
    </div>
    <p id="assignment-dialog-description" className="sr-only">Select an existing class and an approved instructor. Program, subject and section identify the class; only the instructor is updated.</p>
    <form onSubmit={submit} aria-busy={busy}>
      <fieldset disabled={busy} className="grid gap-4">
        <div>
          <Label htmlFor="assignment-program" className="text-xs leading-[14px]">Program</Label>
          <select id="assignment-program" required value={selection.programId} disabled={Boolean(row)} onChange={event => change("programId", event.target.value)} className={selectStyle}>
            <option value="">Select Program</option>
            {data.programs.map(program => <option key={program.id} value={program.id}>{program.program_name}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="assignment-subject" className="text-xs leading-[14px]">Subject</Label>
          <select id="assignment-subject" required value={selection.subject} disabled={Boolean(row) || !selection.programId} onChange={event => change("subject", event.target.value)} className={selectStyle}>
            <option value="">Select Subject</option>
            {subjects.map(subject => <option key={subject} value={subject}>{subject}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="assignment-section" className="text-xs leading-[14px]">Section</Label>
          <select id="assignment-section" required value={selection.classId} disabled={Boolean(row) || !selection.subject} onChange={event => change("classId", event.target.value)} className={selectStyle}>
            <option value="">Select Section</option>
            {sections.map((item, index) => <option key={item.id} value={item.id}>{item.section}{sections.filter(other => other.section === item.section).length > 1
              ? ` — ${[item.year_level, item.semester && `${item.semester} semester`, item.school_year, item.schedule, `Class ${index + 1}`].filter(Boolean).join(" · ")}` : ""}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="assignment-instructor" className="text-xs leading-[14px]">Instructor</Label>
          <select id="assignment-instructor" required value={selection.instructorId} disabled={!selectedClass || !data.instructors.length} onChange={event => change("instructorId", event.target.value)} className={selectStyle}>
            <option value="">Select Instructor</option>
            {data.instructors.map(instructor => <option key={instructor.id} value={instructor.id}>{instructor.name}{data.instructors.filter(other => other.name === instructor.name).length > 1 ? ` (${instructor.email || instructor.id})` : ""}</option>)}
          </select>
        </div>
      </fieldset>
      {!data.instructors.length && <p className="mt-3 text-sm text-slate-600">No approved instructors are available. Approve an instructor in User Management first.</p>}
      {selection.programId && !subjects.length && <p className="mt-3 text-sm text-slate-600">No existing classes in this program. Create a class in Class Management first.</p>}
      {unchanged && selection.instructorId && <p className="mt-3 text-sm text-slate-600">This instructor is already assigned. Choose another instructor to save a change.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-6">
        <Button type="button" variant="outline" disabled={busy} onClick={onClose} className="h-[34px] rounded-lg border-[#827979] px-3 text-[13px] text-[#827979]">Cancel</Button>
        <Button type="submit" disabled={busy || !selectedClass || !selection.instructorId || unchanged} className="h-[34px] rounded-lg bg-[#284fac] px-3 text-[13px] text-white hover:bg-[#203f8a]">{busy && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}{busy ? "Assigning…" : row ? "Save" : "Assign"}</Button>
      </div>
    </form>
  </dialog>;
}
