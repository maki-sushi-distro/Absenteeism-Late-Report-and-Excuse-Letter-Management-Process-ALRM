import { useEffect, useRef } from "react";
import { Check, FileCheck, LoaderCircle, Paperclip, X } from "lucide-react";
import StatusBadge from "@/components/dashboard/StatusBadge";
import RequestFacts from "./RequestFacts";
import useRequestReview from "./useRequestReview";

const decisions = [{ status: "approved", label: "Approve", Icon: Check }, { status: "noted", label: "Note", Icon: FileCheck }, { status: "invalid", label: "Mark Invalid", Icon: X }];

export default function RequestDetailDialog({ request, onClose, onReload }) {
  const dialog = useRef(null);
  const review = useRequestReview(request, onReload);
  useEffect(() => {
    const element = dialog.current;
    if (!element.open) element.showModal();
    return () => { if (element.open) element.close(); };
  }, []);
  return <dialog ref={dialog} aria-labelledby="request-dialog-title" onCancel={event => { event.preventDefault(); if (!review.sending) onClose(); }} onClose={event => { if (!event.currentTarget.open) onClose(); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 text-slate-950 shadow-xl backdrop:bg-black/40 sm:p-6">
    <div className="mb-5 flex items-start justify-between gap-3">
      <div><h2 id="request-dialog-title" className="mb-2 text-lg font-bold text-[#203B82]">Request Details</h2><StatusBadge value={review.record.status} /></div>
      <button type="button" aria-label="Close request" title="Close request" disabled={review.sending} onClick={onClose} className="flex size-8 shrink-0 items-center justify-center rounded hover:bg-slate-100 disabled:opacity-40"><X aria-hidden="true" className="size-5" /></button>
    </div>
    <RequestFacts request={review.record} />
    <div className="mt-5 flex flex-wrap gap-2">
      {request.evidence_file_url ? <button type="button" onClick={review.viewEvidence} disabled={review.opening} className="flex min-h-9 items-center gap-2 rounded border border-slate-300 px-3 text-sm disabled:opacity-50">{review.opening ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Paperclip aria-hidden="true" className="size-4" />}View Attachment</button> : <span className="text-sm text-slate-500">Attachment unavailable</span>}
    </div>
    {review.error && <p role="alert" className="mt-4 text-sm text-red-700">{review.error}</p>}
    {review.message && <p role="status" className="mt-4 text-sm text-green-800">{review.message}</p>}
    {review.record.status === "pending" && <div aria-busy={review.sending} className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
      {decisions.map(({ status, label, Icon }) => <button key={status} type="button" disabled={review.sending} onClick={() => review.submit(status)} className={`flex min-h-9 items-center gap-2 rounded border px-3 text-sm font-semibold disabled:opacity-50 ${status === "invalid" ? "border-red-200 text-red-700" : "border-[#A9B9D9] text-[#203B82]"}`}>{review.sending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Icon aria-hidden="true" className="size-4" />}{label}</button>)}
    </div>}
  </dialog>;
}
