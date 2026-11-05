import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function FollowUpConfirmDialog({ record, description, onCancel, onConfirm }) {
  if (!record) return null;
  return <AlertDialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
    <AlertDialogContent className="w-[calc(100%-2rem)] max-w-[560px]! gap-7 rounded-2xl bg-white p-6 sm:p-8">
      <AlertDialogTitle className="text-xl">Send follow-up?</AlertDialogTitle>
      <AlertDialogDescription className="text-base leading-7">
        Send a separate follow-up for {description || "this pending request"}. Your instructor will receive a new notification.
      </AlertDialogDescription>
      <AlertDialogFooter className="-mx-6 -mb-6 gap-3 border-t border-slate-200 bg-white px-6 py-5 sm:-mx-8 sm:-mb-8 sm:px-8 sm:py-6 dark:bg-slate-950">
        <AlertDialogCancel className="h-11 min-w-24 px-5">Cancel</AlertDialogCancel>
        <Button type="button" onClick={() => onConfirm(record)} className="h-11 min-w-36 bg-[#173D83] px-5 text-white hover:bg-[#101C4A]">Send follow-up</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
