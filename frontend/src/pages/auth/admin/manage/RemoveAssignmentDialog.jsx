import { useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { changeTeachingAssignment } from "@/api/adminAssignments";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { removeAssignmentDescription } from "./removeAssignmentText.js";

export default function RemoveAssignmentDialog({ row, instructors, onClose, onConflict, onSaved }) {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reviewRequired, setReviewRequired] = useState(false);
  const [removed, setRemoved] = useState(false);

  async function remove() {
    if (lock.current || reviewRequired) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (!removed) {
        await changeTeachingAssignment(row.id, {
          action: "remove",
          expected_revision: row.assignment_revision,
          reason: "Removed instructor assignment in Admin Manage.",
        });
        setRemoved(true);
      }
      await onSaved([row.id], "Instructor assignment removed.");
    } catch (failure) {
      const messages = Object.values(failure.errors || {}).flat().filter(value => typeof value === "string");
      setError(messages.join(" ") || failure.message || "The assignment could not be removed.");
      if (failure.status === 409) {
        setReviewRequired(true);
        try {
          await onConflict([row.id]);
          setError(`${messages.join(" ") || failure.message} Close and reopen this dialog to review the current assignment.`);
        } catch {
          setError(`${messages.join(" ") || failure.message} The class could not be refreshed. Close the dialog and reload the list before trying again.`);
        }
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <AlertDialog open onOpenChange={open => { if (!open && !lock.current) onClose(); }}>
    <AlertDialogContent aria-busy={busy} className="gap-5 rounded-[20px] bg-white p-6 sm:p-7">
      <AlertDialogTitle>Remove instructor assignment?</AlertDialogTitle>
      <AlertDialogDescription className="leading-6">{removeAssignmentDescription(row, instructors)}</AlertDialogDescription>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <AlertDialogFooter className="border-t border-slate-200 pt-5"><AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel><Button type="button" disabled={busy || reviewRequired} onClick={remove} className="bg-[#e44343] text-white hover:bg-red-600">{busy && <LoaderCircle className="size-4 animate-spin" />}{busy ? "Removing…" : removed ? "Retry class refresh" : "Remove assignment"}</Button></AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
