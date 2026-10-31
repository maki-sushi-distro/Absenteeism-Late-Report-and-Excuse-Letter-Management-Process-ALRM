import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { fetchEvidence } from "@/api/studentRequests";
import { createEvidenceObjectUrl, releaseEvidenceObjectUrl } from "./evidenceObjectUrl";

const supportedEvidenceTypes = ["application/pdf", "image/jpeg", "image/png"];

export function EvidenceContent({ state }) {
  if (state.status === "loading") return <p role="status" className="py-12 text-center text-sm text-slate-500">Loading evidence...</p>;
  if (state.status === "error") return <p role="alert" className="py-12 text-center text-sm text-red-700">{state.message}</p>;
  if (state.status === "unsupported") return <p role="alert" className="py-12 text-center text-sm text-slate-600">This attachment type is not supported.</p>;
  if (state.status !== "ready") return <p className="py-12 text-center text-sm text-slate-500">Evidence is unavailable.</p>;
  if (state.mimeType === "application/pdf") return <object data={state.url} type="application/pdf" aria-label="PDF evidence" className="h-[65dvh] min-h-80 w-full"><p>PDF preview is unavailable in this browser.</p></object>;
  return <img src={state.url} alt="Uploaded evidence" className="max-h-[65dvh] w-full object-contain" />;
}

export default function EvidenceViewerDialog({ requestId, onClose }) {
  const dialogRef = useRef(null);
  const urlRef = useRef("");
  const [state, setState] = useState({ status: requestId ? "loading" : "unavailable" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    releaseEvidenceObjectUrl(urlRef.current);
    urlRef.current = "";
    if (!requestId) {
      queueMicrotask(() => { if (!controller.signal.aborted) setState({ status: "unavailable" }); });
      return () => controller.abort();
    }
    const loading = Promise.resolve().then(() => {
      if (!controller.signal.aborted) setState({ status: "loading" });
      return fetchEvidence(requestId, { signal: controller.signal });
    });
    loading.then(({ blob, mimeType }) => {
      if (controller.signal.aborted) return;
      if (!supportedEvidenceTypes.includes(mimeType)) {
        setState({ status: "unsupported" });
        return;
      }
      urlRef.current = createEvidenceObjectUrl(blob, urlRef.current);
      setState({ status: "ready", mimeType, url: urlRef.current });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ status: "error", message: error.message || "Evidence could not be loaded." });
    });
    return () => {
      controller.abort();
      releaseEvidenceObjectUrl(urlRef.current);
      urlRef.current = "";
    };
  }, [requestId]);

  return <dialog ref={dialogRef} aria-labelledby="evidence-viewer-title" onClose={onClose} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-2xl backdrop:bg-black/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
      <h2 id="evidence-viewer-title" className="text-lg font-bold">Evidence viewer</h2>
      <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Close evidence viewer" className="rounded p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X aria-hidden="true" className="size-5" /></button>
    </header>
    <div className="p-5"><EvidenceContent state={state} /></div>
  </dialog>;
}
