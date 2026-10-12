import { useState } from "react";
import { createProgram, updateProgram } from "@/api/dashboardData";
import { Button } from "@/components/ui/button";

function ProgramForm({ heads, selected, onCancel, onSaved }) {
  const [name, setName] = useState(selected?.program_name || "");
  const [headId, setHeadId] = useState(selected?.program_head_id || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { program_name: name.trim(), program_head_id: headId || null };
      if (selected) await updateProgram(selected.id, payload);
      else await createProgram(payload);
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }

  return <form onSubmit={submit} className="grid max-w-xl gap-4 border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <h2 className="text-lg font-bold">{selected ? "Edit program" : "Add program"}</h2>
    <label className="grid gap-2 text-sm font-semibold">Program name<input required maxLength={255} value={name} onChange={(event) => setName(event.target.value)} className="h-10 border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" /></label>
    <label className="grid gap-2 text-sm font-semibold">Program head<select value={headId} onChange={(event) => setHeadId(event.target.value)} className="h-10 border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"><option value="">Unassigned</option>{heads.map((head) => <option key={head.id} value={head.id}>{head.name}</option>)}</select></label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving} className="bg-[#203b82] text-white hover:bg-[#172e68]">{saving ? "Saving..." : "Save program"}</Button></div>
  </form>;
}

export default ProgramForm;
