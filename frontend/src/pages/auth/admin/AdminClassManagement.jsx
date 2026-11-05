import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { createClass, getClassesPage, getPrograms, updateClass } from "@/api/admin";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import LoadingSkeleton from "@/components/loading/LoadingSkeleton";
import PageBreadcrumbs from "@/components/navigation/PageBreadcrumbs";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { isGeneralEducationProgram } from "@/lib/programs";
import ClassForm from "./classes/ClassForm";

export default function AdminClassManagement() {
  const [programs, setPrograms] = useState([]);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", programId: "" });
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [programError, setProgramError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState("");
  const [editor, setEditor] = useState(null);
  const [reload, setReload] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    getPrograms().then((items) => { if (mounted.current) setPrograms(Array.isArray(items) ? items : []); })
      .catch((failure) => { if (mounted.current) setProgramError(failure.message || "Programs could not be loaded."); });
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (searchInput === filters.search) return undefined;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setFilters((current) => ({ ...current, search: searchInput.trim() }));
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters.search, searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    getClassesPage({ signal: controller.signal, page, perPage: 10, filters })
      .then((result) => {
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Number(result.meta?.last_page) || 1);
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setRows(result.data);
        setMeta(result.meta);
      })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure.message || "Classes could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, page, reload]);

  async function save(values) {
    if (working) return;
    setWorking("save");
    setError("");
    try {
      if (editor?.item) await updateClass(editor.item.id, values);
      else await createClass(values);
      setNotice(editor?.item ? "Class updated." : "Class created.");
      setEditor(null);
      setLoading(true);
      setReload((current) => current + 1);
    } catch (failure) {
      setError(failure.message || "The class could not be saved.");
    } finally {
      setWorking("");
    }
  }

  const visiblePrograms = programs.filter((program) => !isGeneralEducationProgram(program));
  const currentPage = meta?.page || page;
  const lastPage = Math.max(1, meta?.last_page || 1);
  const start = rows.length ? ((currentPage - 1) * (meta?.per_page || 10)) + 1 : 0;
  const end = start ? start + rows.length - 1 : 0;

  return <div className="grid min-w-0 gap-6">
    <PageBreadcrumbs items={[{ label: "Manage", to: "/manage" }, { label: "Manage Classes" }]} />
    {programError && <ErrorState title="Programs could not be loaded" message={programError} />}
    {error && <ErrorState message={error} />}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <div className="flex justify-end"><Button type="button" onClick={() => setEditor({ item: null })} disabled={Boolean(working)} className="h-10 bg-[#172f6b] px-4 text-white hover:bg-[#203f8a]">Create Class</Button></div>
    <AlertDialog open={Boolean(editor)} onOpenChange={(open) => { if (!open && !working) setEditor(null); }}>
      {editor && <AlertDialogContent className="max-h-[calc(100vh-2rem)] max-w-[960px]! overflow-y-auto bg-white p-0">
        <AlertDialogTitle className="sr-only">{editor.item ? "Edit Class" : "Create Class"}</AlertDialogTitle>
        <ClassForm key={editor.item?.id || "new"} item={editor.item} programs={visiblePrograms} saving={working === "save"} onCancel={() => setEditor(null)} onSave={save} />
      </AlertDialogContent>}
    </AlertDialog>
    <section aria-labelledby="existing-classes-title" className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
      <h1 id="existing-classes-title" className="mb-4 text-lg font-semibold">Existing Classes</h1>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <div className="relative"><Input type="search" aria-label="Search classes" placeholder="Search subject, section, instructor or program" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="pr-9" /><Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /></div>
        <select aria-label="Filter classes by program" value={filters.programId} onChange={(event) => { setLoading(true); setError(""); setFilters((current) => ({ ...current, programId: event.target.value })); setPage(1); }} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">All programs</option>{visiblePrograms.map((program) => <option key={program.id} value={program.id}>{program.program_name}</option>)}</select>
      </div>
      {loading ? <LoadingSkeleton variant="table" rows={10} columns={4} label="Loading classes" /> : rows.length === 0 ? <EmptyState title="No classes found" message="No classes match the current search and filters." /> : <div className="grid gap-3 lg:grid-cols-2">{rows.map((item) => <article key={item.id} className="min-w-0 rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words font-medium">{item.subject_name}</span><Button size="sm" variant="outline" onClick={() => setEditor({ item })} disabled={Boolean(working)}>Edit</Button></div><p className="mt-2 break-words text-xs text-slate-500">{item.program?.program_name || "Program"} · {item.year_level || "Year unavailable"} · {item.semester || "Semester unavailable"} Semester</p></article>)}</div>}
      {!loading && <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"><p>Showing {start}–{end} of {meta?.total ?? rows.length} classes</p><nav aria-label="Class list pagination" className="flex items-center gap-2"><Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={currentPage <= 1 || Boolean(working)} onClick={() => { setLoading(true); setPage(currentPage - 1); }}><ChevronLeft /></Button><span>Page {currentPage} of {lastPage}</span><Button variant="outline" size="icon-sm" aria-label="Next page" disabled={currentPage >= lastPage || Boolean(working)} onClick={() => { setLoading(true); setPage(currentPage + 1); }}><ChevronRight /></Button></nav></div>}
    </section>
  </div>;
}
