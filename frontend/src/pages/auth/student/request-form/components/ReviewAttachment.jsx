import { Trash2 } from "lucide-react";
import ErrorText from "./ErrorText";
import { EVIDENCE } from "../constants";
import UploadProgress from "@/components/loading/UploadProgress";

export default function ReviewAttachment({ file, error, onFileChange, updateField, processing }) {
  return <div className="grid min-w-0 gap-2 sm:col-span-2">
    <label htmlFor="review-evidence" className="text-xs font-medium text-slate-600 dark:text-slate-300">Supporting document</label>
    <input id="review-evidence" type="file" disabled={processing} accept={EVIDENCE.accept} aria-invalid={Boolean(error)} aria-describedby={error ? "review-evidence-error" : "review-evidence-hint"} onChange={(event) => {
      onFileChange(event.target.files?.[0]);
      event.target.value = "";
    }} className="w-full min-w-0 rounded-md border border-slate-300 p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-blue-800 dark:border-slate-700 dark:text-slate-200 dark:file:bg-slate-800 dark:file:text-blue-200" />
    <div className="flex min-w-0 items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
      <p className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{file?.name || "No file selected"}</p>
      {file && <button type="button" disabled={processing} title="Remove supporting document" aria-label="Remove supporting document" onClick={() => updateField("evidenceFile", null)} className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950"><Trash2 className="size-4" /></button>}
    </div>
    {processing ? <UploadProgress id="review-evidence-hint" label="Checking your file..." /> : <p id="review-evidence-hint" className="text-xs text-slate-500 dark:text-slate-400">{EVIDENCE.hint}</p>}
    {error && <div id="review-evidence-error" role="alert"><ErrorText message={error} /></div>}
  </div>;
}
