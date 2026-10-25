import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createClass,
  createProgram,
  deleteClass,
  deleteProgram,
  downloadReport,
  getAdminDashboard,
  getClasses,
  getAdminUsers,
  getPrograms,
  updateStaffRole,
} from "@/api/admin";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { MetricPlaceholder, SectionPlaceholder } from "@/components/loading/DashboardSkeleton/StaffDashboardPlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyProgramForm = { program_name: "", program_head_id: "" };
const emptyClassForm = { subject_name: "", section: "", instructor_id: "", schedule: "", program_id: "", semester: "1st", school_year: "" };
const emptyReportFilters = { program_id: "", status: "", date_from: "", date_to: "" };
const endpoints = { dashboard: getAdminDashboard, users: getAdminUsers, programs: getPrograms, classes: getClasses };
const pendingResources = { dashboard: true, users: true, programs: true, classes: true };
const viewResources = { dashboard: Object.keys(endpoints), users: ["users"], programs: ["programs", "users"], classes: ["classes", "users", "programs"], reports: ["programs"] };

export function AdminDashboard({ view = "dashboard" }) {
  const [resources, setResources] = useState({
    dashboard: null, users: [], programs: [], classes: [],
    loading: pendingResources, errors: {}, ready: {},
  });
  const { dashboard, users, programs, classes, loading: resourceLoading, errors, ready } = resources;
  const generation = useRef(0);
  const mounted = useRef(false);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [reportFilters, setReportFilters] = useState(emptyReportFilters);
  const [roleSelections, setRoleSelections] = useState({});
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const metrics = useMemo(
    () => [
      ["Programs", dashboard?.total_programs ?? "—"],
      ["Classes", dashboard?.total_classes ?? "—"],
      ["Students", dashboard?.total_students ?? "—"],
      ["Instructors", dashboard?.total_instructors ?? "—"],
      ["Program heads", dashboard?.total_program_heads ?? "—"],
      ["Pending requests", dashboard?.pending_requests ?? "—"],
      ["Warnings", dashboard?.warning_count ?? "—"],
      ["IR cases", dashboard?.ir_count ?? "—"],
    ],
    [dashboard],
  );

  const loadData = useCallback(async () => {
    if (!mounted.current) return;
    const request = ++generation.current;
    setResources((previous) => ({ ...previous, loading: pendingResources, errors: {} }));
    // Await completion for mutation callers; each resource publishes as it settles.
    await Promise.allSettled(Object.entries(endpoints).map(async ([key, fetchData]) => {
      try {
        const data = await fetchData();
        if (request !== generation.current) return;
        const valid = key === "dashboard" ? data && typeof data === "object" && !Array.isArray(data) : Array.isArray(data);
        if (!valid) throw new Error(`Unexpected ${key} response.`);
        setResources((previous) => ({
          ...previous, [key]: data,
          loading: { ...previous.loading, [key]: false },
          ready: { ...previous.ready, [key]: true },
          errors: { ...previous.errors, [key]: "" },
        }));
      } catch (requestError) {
        if (request !== generation.current) return;
        setResources((previous) => ({
          ...previous,
          loading: { ...previous.loading, [key]: false },
          errors: { ...previous.errors, [key]: requestError?.message || `Could not load ${key}.` },
        }));
      }
    }));
  }, []);

  useEffect(() => {
    const requests = generation;
    mounted.current = true;
    const timer = window.setTimeout(loadData, 0);
    return () => { window.clearTimeout(timer); mounted.current = false; requests.current++; };
  }, [loadData]);

  function updateProgramForm(event) {
    const { name, value } = event.target;
    setProgramForm((current) => ({ ...current, [name]: value }));
  }

  function updateClassForm(event) {
    const { name, value } = event.target;
    setClassForm((current) => ({ ...current, [name]: value }));
  }

  function updateReportFilters(event) {
    const { name, value } = event.target;
    setReportFilters((current) => ({ ...current, [name]: value }));
  }

  async function runAction(action, successMessage) {
    setError("");
    setNotice("");

    try {
      await action();
      if (!mounted.current) return false;
      setNotice(successMessage);
      await loadData();
      return mounted.current;
    } catch (requestError) {
      if (mounted.current) setError(requestError.message);
      return false;
    } finally {
      if (mounted.current) setWorking("");
    }
  }

  async function handleCreateProgram(event) {
    event.preventDefault();
    if (!programOptionsReady) return;
    setWorking("create-program");
    const created = await runAction(
      () => createProgram({ program_name: programForm.program_name, program_head_id: programForm.program_head_id || null }),
      "Program created.",
    );
    if (created) setProgramForm(emptyProgramForm);
  }

  async function handleCreateClass(event) {
    event.preventDefault();
    if (!classOptionsReady) return;
    setWorking("create-class");
    const created = await runAction(
      () => createClass(classForm),
      "Class created.",
    );
    if (created) setClassForm(emptyClassForm);
  }

  async function handleDownloadReport(event) {
    event.preventDefault();
    setWorking("report");
    setError("");
    setNotice("");

    try {
      await downloadReport(reportFilters);
      if (mounted.current) setNotice("Report download started.");
    } catch (requestError) {
      if (mounted.current) setError(requestError.message);
    } finally {
      if (mounted.current) setWorking("");
    }
  }

  const loading = (viewResources[view] || []).some((key) => resourceLoading[key]);
  const waiting = (key) => resourceLoading[key] && !ready[key];
  const programOptionsReady = ready.users && !resourceLoading.users && !errors.users;
  const classOptionsReady = programOptionsReady && ready.programs && !resourceLoading.programs && !errors.programs;
  function resourceError(key) {
    return <div className="space-y-2"><ErrorState title={`Could not load ${key}`} message={errors[key]} /><button type="button" onClick={() => { void loadData(); }} className="text-sm font-medium text-blue-800 underline dark:text-blue-300">Retry loading</button></div>;
  }
  const showMetrics = view === "dashboard";
  const showUsers = view === "dashboard" || view === "users";
  const showPrograms = view === "dashboard" || view === "programs";
  const showClasses = view === "dashboard" || view === "classes";
  const showReports = view === "dashboard" || view === "reports";
  const staffUsers = users.filter((user) => ["instructor", "program_head", "administrator"].includes(user.role));
  const instructors = users.filter((user) => user.role === "instructor");
  const programHeads = users.filter((user) => ["instructor", "program_head"].includes(user.role));

  return (
    <div className="space-y-6" data-slot={view === "dashboard" && loading ? "dashboard-skeleton" : undefined} data-variant={view === "dashboard" ? "admin" : undefined}>
      {loading ? <span role="status" aria-busy="true" className="sr-only">Loading administrator data</span> : null}
      {error ? <ErrorState message={error} /> : null}
      {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}

      {showMetrics ? errors.dashboard ? resourceError("dashboard") : <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => waiting("dashboard") ? <MetricPlaceholder key={label} /> : (
          <article key={label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </section> : null}

      {showUsers ? waiting("users") ? <SectionPlaceholder rows={5} /> : errors.users ? resourceError("users") : <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Staff role assignment</h2>
        {staffUsers.length === 0 ? <EmptyState title="No staff accounts" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <tbody className="divide-y divide-slate-100">
                {staffUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3 font-medium">{user.name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3"><StatusBadge value={user.status} /></td>
                    <td className="px-4 py-3">
                      <select value={roleSelections[user.id] || user.role} onChange={(event) => setRoleSelections((current) => ({ ...current, [user.id]: event.target.value }))} className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-sm">
                        <option value="instructor">Instructor</option>
                        <option value="program_head">Program Head</option>
                        <option value="administrator">Administrator</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" disabled={Boolean(working) || (roleSelections[user.id] || user.role) === user.role} onClick={() => { setWorking(`role-${user.id}`); runAction(() => updateStaffRole(user.id, roleSelections[user.id]), "Staff role assigned."); }}>Assign role</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section> : null}

      {(showPrograms || showClasses) ? <section className="grid gap-6 xl:grid-cols-2">
        {showPrograms ? waiting("programs") ? <SectionPlaceholder form /> : errors.programs ? resourceError("programs") : <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Programs</h2>
          {!showUsers && errors.users ? resourceError("users") : null}
          <form className="mb-5 grid gap-3 md:grid-cols-[1fr_12rem_auto]" onSubmit={handleCreateProgram}>
            <div className="space-y-2"><Label htmlFor="program_name">Program name</Label><Input id="program_name" name="program_name" value={programForm.program_name} onChange={updateProgramForm} required /></div>
            <div className="space-y-2"><Label htmlFor="program_head_id">Program head</Label><select id="program_head_id" name="program_head_id" disabled={!programOptionsReady} value={programForm.program_head_id} onChange={updateProgramForm} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Unassigned</option>{programHeads.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>
            <div className="flex items-end"><Button type="submit" disabled={!programOptionsReady || working === "create-program"}>Create</Button></div>
          </form>
          {programs.length === 0 ? <EmptyState title="No programs found" /> : (
            <div className="space-y-3">{programs.map((program) => <article key={program.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-medium">{program.program_name}</span><Button size="sm" variant="destructive" onClick={() => { setWorking(`delete-program-${program.id}`); runAction(() => deleteProgram(program.id), "Program deleted."); }}>Delete</Button></div><p className="mt-2 text-xs text-slate-500">ID {program.id} · {program.classes_count || 0} classes</p></article>)}</div>
          )}
        </div> : null}

        {showClasses ? waiting("classes") ? <SectionPlaceholder form /> : errors.classes ? resourceError("classes") : <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Classes</h2>
          {!showUsers && errors.users ? resourceError("users") : null}
          {!showPrograms && errors.programs ? resourceError("programs") : null}
          <form className="mb-5 grid gap-3 md:grid-cols-2" onSubmit={handleCreateClass}>
            <Input name="subject_name" value={classForm.subject_name} onChange={updateClassForm} placeholder="Subject" aria-label="Subject" required />
            <Input name="section" value={classForm.section} onChange={updateClassForm} placeholder="Section" aria-label="Section" required />
            <Input name="schedule" value={classForm.schedule} onChange={updateClassForm} placeholder="Schedule" aria-label="Schedule" required />
            <select name="instructor_id" aria-label="Instructor" disabled={!programOptionsReady} value={classForm.instructor_id} onChange={updateClassForm} required className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select instructor</option>{instructors.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
            <select name="program_id" aria-label="Program" disabled={resourceLoading.programs || Boolean(errors.programs)} value={classForm.program_id} onChange={updateClassForm} required className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.program_name}</option>)}</select>
            <select name="semester" aria-label="Semester" value={classForm.semester} onChange={updateClassForm} required className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="1st">1st semester</option><option value="2nd">2nd semester</option></select>
            <Input name="school_year" value={classForm.school_year} onChange={updateClassForm} placeholder="School year (2026-2027)" aria-label="School year" pattern="[0-9]{4}-[0-9]{4}" required />
            <Button type="submit" disabled={!classOptionsReady || working === "create-class"} className="md:col-span-2">Create class</Button>
          </form>
          {classes.length === 0 ? <EmptyState title="No classes found" /> : (
            <div className="space-y-3">{classes.map((item) => <article key={item.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-medium">{item.subject_name}</span><Button size="sm" variant="destructive" onClick={() => { setWorking(`delete-class-${item.id}`); runAction(() => deleteClass(item.id), "Class deleted."); }}>Delete</Button></div><p className="mt-2 text-xs text-slate-500">ID {item.id} · {item.program?.program_name || "Program"}</p></article>)}</div>
          )}
        </div> : null}
      </section> : null}

      {showReports ? waiting("programs") ? <SectionPlaceholder form rows={0} /> : errors.programs ? (!showPrograms ? resourceError("programs") : null) : <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Export requests report</h2>
        <form className="grid gap-3 md:grid-cols-5" onSubmit={handleDownloadReport}>
          <select name="program_id" aria-label="Program" value={reportFilters.program_id} onChange={updateReportFilters} className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">All programs</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.program_name}</option>)}</select>
          <select name="status" value={reportFilters.status} onChange={updateReportFilters} className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm"><option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="noted">Noted</option><option value="invalid">Invalid</option></select>
          <Input name="date_from" type="date" value={reportFilters.date_from} onChange={updateReportFilters} />
          <Input name="date_to" type="date" value={reportFilters.date_to} onChange={updateReportFilters} />
          <Button type="submit" disabled={working === "report"}>Download</Button>
        </form>
      </section> : null}
    </div>
  );
}
