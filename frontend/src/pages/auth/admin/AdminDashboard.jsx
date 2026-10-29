import { useCallback, useEffect, useRef, useState } from "react";
import {
  createClass,
  createProgram,
  deleteClass,
  deleteProgram,
  getAdminDashboard,
  getClasses,
  getPrograms,
  updateStaffRole,
} from "@/api/admin";
import { getUserManagementUsers } from "@/api/adminUserManagement";
import AdminOverview from "./dashboard/AdminOverview";
import AdminReports from "./reports/AdminReports";
import PageBreadcrumbs from "@/components/navigation/PageBreadcrumbs";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SectionPlaceholder } from "@/components/loading/DashboardSkeleton/StaffDashboardPlaceholder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyProgramForm = { program_name: "", program_head_id: "" };
const emptyClassForm = { subject_name: "", section: "", instructor_id: "", schedule: "", program_id: "", year_level: "", semester: "1st", school_year: "" };
const endpoints = { dashboard: getAdminDashboard, users: getUserManagementUsers, programs: getPrograms, classes: getClasses };
const pendingResources = { dashboard: true, users: true, programs: true, classes: true };
const viewResources = { dashboard: Object.keys(endpoints), users: ["users"], programs: ["programs", "users"], classes: ["classes", "users", "programs"], reports: ["programs"] };

export function AdminDashboard({ view = "dashboard" }) {
  const [resources, setResources] = useState({
    dashboard: null, users: [], programs: [], classes: [],
    loading: pendingResources, errors: {}, ready: {},
  });
  const { users, programs, classes, loading: resourceLoading, errors, ready } = resources;
  const generation = useRef(0);
  const mounted = useRef(false);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [roleSelections, setRoleSelections] = useState({});
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
    if (!programOptionsReady || working) return;
    if (programForm.program_head_id && !programHeads.some(user => String(user.id) === programForm.program_head_id)) { setError("Select a program head from the available list."); return; }
    setWorking("create-program");
    const created = await runAction(
      () => createProgram({ program_name: programForm.program_name, program_head_id: programForm.program_head_id || null }),
      "Program created.",
    );
    if (created) setProgramForm(emptyProgramForm);
  }

  async function handleCreateClass(event) {
    event.preventDefault();
    if (!classOptionsReady || working) return;
    if (!instructors.some(user => String(user.id) === classForm.instructor_id) || !programs.some(program => String(program.id) === classForm.program_id)) { setError("Select an instructor and program from the available lists."); return; }
    setWorking("create-class");
    const created = await runAction(
      () => createClass(classForm),
      "Class created.",
    );
    if (created) setClassForm(emptyClassForm);
  }

  const loading = (viewResources[view] || []).some((key) => resourceLoading[key]);
  const waiting = (key) => resourceLoading[key] && !ready[key];
  const programOptionsReady = ready.users && !resourceLoading.users && !errors.users;
  const classOptionsReady = programOptionsReady && ready.programs && !resourceLoading.programs && !errors.programs;
  function resourceError(key) {
    return <div className="space-y-2"><ErrorState title={`Could not load ${key}`} message={errors[key]} /><button type="button" onClick={() => { void loadData(); }} className="text-sm font-medium text-blue-800 underline dark:text-blue-300">Retry loading</button></div>;
  }
  const showUsers = view === "users";
  const showPrograms = view === "programs";
  const showClasses = view === "classes";
  const showReports = view === "reports";
  const staffUsers = users.filter((user) => ["instructor", "program_head", "administrator"].includes(user.role));
  const instructors = users.filter((user) => user.role === "instructor");
  const programHeads = users.filter((user) => ["instructor", "program_head"].includes(user.role));

  if (view === "dashboard") return <AdminOverview resources={resources} onRetry={loadData} />;

  return (
    <div className="space-y-6" data-slot={view === "dashboard" && loading ? "dashboard-skeleton" : undefined} data-variant={view === "dashboard" ? "admin" : undefined}>
      {showClasses && <PageBreadcrumbs items={[{ label: "Manage", to: "/manage" }, { label: "Manage Classes" }]} />}
      {showPrograms && <PageBreadcrumbs items={[{ label: "Program Overview", to: "/program-overview" }, { label: "Manage Programs" }]} />}
      {loading ? <span role="status" aria-busy="true" className="sr-only">Loading administrator data</span> : null}
      {error ? <ErrorState message={error} /> : null}
      {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}

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

      {(showPrograms || showClasses) ? <section className="grid min-w-0 gap-6">
        {showPrograms ? waiting("programs") ? <SectionPlaceholder form /> : errors.programs ? resourceError("programs") : <div className="rounded-lg border border-slate-200 bg-white p-5 text-[#0D1526]">
          <h2 className="mb-4 text-lg font-semibold">Programs</h2>
          {!showUsers && errors.users ? resourceError("users") : null}
          <form className="mb-6 grid items-end gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_140px]" onSubmit={handleCreateProgram}>
            <div className="min-w-0 space-y-2"><Label htmlFor="program_name">Program name</Label><Input id="program_name" name="program_name" value={programForm.program_name} onChange={updateProgramForm} className="h-11 rounded-lg text-[#0D1526]" required /></div>
            <div className="min-w-0 space-y-2"><Label htmlFor="program_head_id">Program head</Label><select id="program_head_id" name="program_head_id" disabled={!programOptionsReady} value={programForm.program_head_id} onChange={updateProgramForm} className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-[#0D1526]"><option value="">Unassigned</option>{programHeads.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>
            <div className="flex items-end md:col-span-2 xl:col-span-1"><Button type="submit" disabled={!programOptionsReady || working === "create-program"} className="h-11 w-full rounded-lg bg-[#172f6b] px-6 text-white hover:bg-[#203f8a] sm:w-[140px] xl:w-full">Create</Button></div>
          </form>
          {programs.length === 0 ? <EmptyState title="No programs found" /> : (
            <div className="grid gap-4 lg:grid-cols-2">{programs.map((program) => <article key={program.id} className="min-w-0 rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words font-medium">{program.program_name}</span><Button size="sm" variant="destructive" className="shrink-0" onClick={() => { setWorking(`delete-program-${program.id}`); runAction(() => deleteProgram(program.id), "Program deleted."); }}>Delete</Button></div><p className="mt-2 break-words text-xs text-slate-500">ID {program.id} · {program.classes_count || 0} classes</p></article>)}</div>
          )}
        </div> : null}

        {showClasses ? waiting("classes") ? <div className="grid gap-6"><SectionPlaceholder form rows={0} /><SectionPlaceholder rows={3} /></div> : errors.classes ? resourceError("classes") : <div className="grid min-w-0 gap-6">
          <section aria-labelledby="create-class-title" className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
          <h2 id="create-class-title" className="mb-4 text-lg font-semibold">Create Class</h2>
          {!showUsers && errors.users ? resourceError("users") : null}
          {!showPrograms && errors.programs ? resourceError("programs") : null}
          <form className="grid gap-x-6 gap-y-6 md:grid-cols-2" onSubmit={handleCreateClass}>
            <Input name="subject_name" value={classForm.subject_name} onChange={updateClassForm} placeholder="Subject" aria-label="Subject" className="h-11" required />
            <Input name="section" value={classForm.section} onChange={updateClassForm} placeholder="Section" aria-label="Section" className="h-11" required />
            <Input name="schedule" value={classForm.schedule} onChange={updateClassForm} placeholder="Schedule" aria-label="Schedule" className="h-11" required />
            <select name="instructor_id" aria-label="Instructor" disabled={!programOptionsReady} value={classForm.instructor_id} onChange={updateClassForm} required className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select instructor</option>{instructors.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
            <select name="program_id" aria-label="Program" disabled={resourceLoading.programs || Boolean(errors.programs)} value={classForm.program_id} onChange={updateClassForm} required className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.program_name}</option>)}</select>
            <select name="semester" aria-label="Semester" value={classForm.semester} onChange={updateClassForm} required className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="1st">1st semester</option><option value="2nd">2nd semester</option></select>
            <select name="year_level" aria-label="Year level" value={classForm.year_level} onChange={updateClassForm} required className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm"><option value="">Select year level</option>{["1st", "2nd", "3rd", "4th"].map(year => <option key={year} value={year}>{year} year</option>)}</select>
            <Input name="school_year" value={classForm.school_year} onChange={updateClassForm} placeholder="School year (2026-2027)" aria-label="School year" pattern="[0-9]{4}-[0-9]{4}" className="h-11" required />
            <Button type="submit" disabled={!classOptionsReady || working === "create-class"} className="h-11 w-full justify-self-center bg-[#172f6b] px-6 py-3 text-white hover:bg-[#203f8a] md:col-span-2 md:w-[calc(50%-0.75rem)]">Create class</Button>
          </form>
          </section>
          <section aria-labelledby="existing-classes-title" className="min-w-0 rounded-lg border border-slate-200 bg-white p-5">
          <h2 id="existing-classes-title" className="mb-4 text-lg font-semibold">Existing Classes</h2>
          {classes.length === 0 ? <EmptyState title="No classes found" /> : (
            <div className="grid gap-3 lg:grid-cols-2">{classes.map((item) => <article key={item.id} className="min-w-0 rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words font-medium">{item.subject_name}</span><Button size="sm" variant="destructive" className="shrink-0" onClick={() => { setWorking(`delete-class-${item.id}`); runAction(() => deleteClass(item.id), "Class deleted."); }}>Delete</Button></div><p className="mt-2 break-words text-xs text-slate-500">ID {item.id} · {item.program?.program_name || "Program"}</p></article>)}</div>
          )}
          </section>
        </div> : null}
      </section> : null}

      {showReports ? waiting("programs") ? <SectionPlaceholder form rows={0} /> : errors.programs ? resourceError("programs") : <AdminReports programs={programs} /> : null}
    </div>
  );
}
