import { useState } from "react";
import { decideInstructorRequest } from "@/api/dashboardData";
import { Button } from "@/components/ui/button";

const decisions = ["approved", "noted", "invalid"];

function DecisionPanel({ request, onClose, onSaved }) {
  const [status, setStatus] = useState("approved");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await decideInstructorRequest(request.id, status);
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div role="dialog" aria-modal="true" aria-labelledby="decision-title" className="w-full max-w-lg border border-slate-200 bg-white p-6 text-slate-950 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <h2 id="decision-title" className="text-lg font-bold">Review request</h2>
      <p className="mt-2 text-sm">{request.enrollment?.student?.name || "Student"} · {request.enrollment?.class?.subject_name || "Class"}</p>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{request.reason}</p>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-semibold">Decision<select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950">{decisions.map((option) => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</select></label>
        {status === "invalid" && <p className="text-xs text-amber-700 dark:text-amber-300">Invalid requests increase the student&apos;s attendance tracker.</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#203b82] text-white hover:bg-[#172e68]">{saving ? "Saving..." : "Confirm decision"}</Button></div>
      </form>
    </div>
  </div>;
}

export default DecisionPanel;
