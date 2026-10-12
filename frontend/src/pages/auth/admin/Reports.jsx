import { useState } from "react";
import { downloadReport, getPrograms, getReportPreview } from "@/api/dashboardData";
import { Button } from "@/components/ui/button";
import PageHeading from "@/components/dashboard/PageHeading";
import { ResourceState } from "@/components/dashboard/ResourceState";
import { useApiResource } from "@/hooks/useApiResource";
import AdminPageLayout from "./AdminPageLayout";

const initialFilters = { program_id: "", status: "", date_from: "", date_to: "" };

function Reports() {
  const programs = useApiResource(getPrograms);
  const [filters, setFilters] = useState(initialFilters);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function update(key, value) { setFilters((current) => ({ ...current, [key]: value })); setPreview(null); setError(""); }
  async function showPreview(event) {
    event.preventDefault();
    setBusy(true); setError("");
    try { setPreview(await getReportPreview(filters)); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function exportFile() {
    setBusy(true); setError("");
    try { await downloadReport(filters); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <AdminPageLayout>
    <PageHeading title="Reports" description="Preview and export request records" />
    <ResourceState {...programs} onRetry={programs.reload}>
      <div className="max-w-3xl">
        <form onSubmit={showPreview} className="grid gap-4 border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold">Program<select value={filters.program_id} onChange={(event) => update("program_id", event.target.value)} className="h-10 border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"><option value="">All programs</option>{(programs.data || []).map((program) => <option key={program.id} value={program.id}>{program.program_name}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">Status<select value={filters.status} onChange={(event) => update("status", event.target.value)} className="h-10 border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950"><option value="">All statuses</option>{["pending", "approved", "noted", "invalid"].map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-semibold">From<input type="date" value={filters.date_from} onChange={(event) => update("date_from", event.target.value)} className="h-10 border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" /></label>
          <label className="grid gap-2 text-sm font-semibold">To<input type="date" min={filters.date_from || undefined} value={filters.date_to} onChange={(event) => update("date_to", event.target.value)} className="h-10 border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-950" /></label>
          <div className="md:col-span-2"><Button type="submit" disabled={busy} className="bg-[#203b82] text-white hover:bg-[#172e68]">{busy ? "Loading..." : "Preview export"}</Button></div>
        </form>
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
        {preview && <div className="mt-5 border border-slate-200 bg-white p-5 text-sm dark:border-slate-800 dark:bg-slate-900"><p className="font-bold">{preview.row_count} request records</p><p className="mt-1 text-slate-600 dark:text-slate-400">{preview.date_from} to {preview.date_to}</p>{preview.exceeds_limit ? <p className="mt-3 text-red-600">This exceeds the {preview.max_export_rows}-row limit. Narrow your filters.</p> : <Button className="mt-4 bg-[#203b82] text-white hover:bg-[#172e68]" disabled={busy || preview.row_count === 0} onClick={exportFile}>Download XLSX</Button>}</div>}
      </div>
    </ResourceState>
  </AdminPageLayout>;
}

export default Reports;
