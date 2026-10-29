import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { getClassPendingRequests, submitAssignmentAction } from "@/api/adminAssignments";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import PendingRequestsList from "./PendingRequestsList";
import { assignedInstructor, assignmentRevision, pendingRequestCount } from "./assignments.js";

export default function RemoveAssignmentDialog({ row, instructors, onClose, onConflict, onSaved }) {
  const lock = useRef(false);
  const [reason, setReason] = useState("");
  const [requests, setRequests] = useState([]);
  const [loaded, setLoaded] = useState(pendingRequestCount(row) === 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const instructor = assignedInstructor(row, instructors);
  const firstName = instructor?.first_name || instructor?.name || "the instructor";
  const blocked = (loaded ? requests.length : pendingRequestCount(row)) > 0 || !loaded;

  async function loadPending() {
    try {
      const next = await getClassPendingRequests(row.id);
      setRequests(next);
      setLoaded(true);
      return next;
    } catch (issue) {
      setError(issue.message || "Pending requests could not be loaded.");
      return null;
    }
  }

  useEffect(() => {
    if (pendingRequestCount(row) === 0) return undefined;
    let active = true;
    getClassPendingRequests(row.id).then(next => {
      if (active) { setRequests(next); setLoaded(true); }
    }).catch(issue => {
      if (active) setError(issue.message || "Pending requests could not be loaded.");
    });
    return () => { active = false; };
  }, [row]);

  async function remove() {
    if (lock.current || blocked || !reason.trim() || assignmentRevision(row) === null) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await submitAssignmentAction(row.id, { action: "remove", expected_revision: assignmentRevision(row), reason });
      await onSaved([row.id], "Instructor assignment removed.");
    } catch (failure) {
      if (failure.status === 409) {
        await onConflict([row.id]);
        const next = await loadPending();
        setError(next?.length ? "New pending requests must be resolved before this assignment can be removed." : "This assignment changed while you were editing. Please review the updated details and confirm again.");
      } else {
        const messages = Object.values(failure.errors || {}).flat().filter(value => typeof value === "string");
        setError(messages.join(" ") || failure.message || "The assignment could not be removed.");
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <AlertDialog open onOpenChange={open => { if (!open && !lock.current) onClose(); }}>
    <AlertDialogContent aria-busy={busy} className="rounded-[20px] bg-white">
      <AlertDialogTitle>Remove instructor assignment?</AlertDialogTitle>
      <AlertDialogDescription>Aalisin si {firstName} sa {row.subject_name || "class"} — {row.section || "section unavailable"}. Mananatili ang class, enrolled students, at request history. Magiging Unassigned ang class.</AlertDialogDescription>
      <div className="grid gap-2"><Label htmlFor="remove-assignment-reason">Reason</Label><textarea id="remove-assignment-reason" required rows={3} value={reason} disabled={busy} onChange={event => { setReason(event.target.value); setError(""); }} className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[#284fac]" /></div>
      <PendingRequestsList classRow={row} count={loaded ? requests.length : pendingRequestCount(row)} requests={requests} loading={!loaded} />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button type="button" disabled={busy || blocked || !reason.trim() || assignmentRevision(row) === null} onClick={remove} className="bg-[#e44343] text-white hover:bg-red-600">{busy && <LoaderCircle className="size-4 animate-spin" />}{busy ? "Removing…" : "Remove assignment"}</Button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
