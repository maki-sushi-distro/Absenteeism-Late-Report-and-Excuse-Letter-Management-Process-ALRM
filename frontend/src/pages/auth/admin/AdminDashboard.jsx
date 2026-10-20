import { useEffect, useMemo, useState } from "react";
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
import LoadingSkeleton from "@/components/loading/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const emptyProgramForm = { program_name: "", program_head_id: "" };
const emptyClassForm = { subject_name: "", section: "", instructor_id: "", schedule: "", program_id: "", semester: "1st", school_year: "" };
const emptyReportFilters = { program_id: "", status: "", date_from: "", date_to: "" };

export function AdminDashboard({ view = "dashboard" }) {
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [programForm, setProgramForm] = useState(emptyProgramForm);
  const [classForm, setClassForm] = useState(emptyClassForm);
  const [reportFilters, setReportFilters] = useState(emptyReportFilters);
  const [roleSelections, setRoleSelections] = useState({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const metrics = useMemo(
    () => [
      ["Programs", dashboard?.total_programs || 0],
      ["Classes", dashboard?.total_classes || 0],
      ["Students", dashboard?.total_students || 0],
      ["Instructors", dashboard?.total_instructors || 0],
      ["Program heads", dashboard?.total_program_heads || 0],
      ["Pending requests", dashboard?.pending_requests || 0],
      ["Warnings", dashboard?.warning_count || 0],
      ["IR cases", dashboard?.ir_count || 0],
    ],
    [dashboard],
  );

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [dashboardData, usersData, programsData, classesData] = await Promise.all([
        getAdminDashboard(),
        getAdminUsers(),
        getPrograms(),
        getClasses(),
      ]);
      setDashboard(dashboardData);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setPrograms(programsData || []);
      setClasses(classesData || []);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, []);

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
      setNotice(successMessage);
      await loadData();
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setWorking("");
    }
  }

  async function handleCreateProgram(event) {
    event.preventDefault();
    setWorking("create-program");
    const created = await runAction(
      () => createProgram({ program_name: programForm.program_name, program_head_id: programForm.program_head_id || null }),
      "Program created.",
    );
    if (created) setProgramForm(emptyProgramForm);
  }

  async function handleCreateClass(event) {
    event.preventDefault();
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
      setNotice("Report download started.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setWorking("");
    }
  }

  if (loading) {
    return (
      <LoadingSkeleton
        variant={view === "dashboard" ? "dashboard" : view === "users" ? "table" : view === "reports" ? "form" : "list"}
        columns={view === "dashboard" ? 4 : 5}
        label="Loading administrator data"
      />
    );
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
    <div className="space-y-6">
      {error ? <ErrorState message={error} /> : null}
      {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}

      {showMetrics ? <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </article>
        ))}
      </section> : null}

      {showUsers ? <section className="rounded-lg border border-slate-200 bg-white p-5">
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
        {showPrograms ? <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Programs</h2>
          <form className="mb-5 grid gap-3 md:grid-cols-[1fr_12rem_auto]" onSubmit={handleCreateProgram}>
            <div className="space-y-2"><Label htmlFor="program_name">Program name</Label><Input id="program_name" name="program_name" value={programForm.program_name} onChange={updateProgramForm} required /></div>
            <div className="space-y-2"><Label htmlFor="program_head_id">Program head</Label><select id="program_head_id" name="program_head_id" value={programForm.program_head_id} onChange={updateProgramForm} className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Unassigned</option>{programHeads.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></div>
            <div className="flex items-end"><Button type="submit" disabled={working === "create-program"}>Create</Button></div>
          </form>
          {programs.length === 0 ? <EmptyState title="No programs found" /> : (
            <div className="space-y-3">{programs.map((program) => <article key={program.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-medium">{program.program_name}</span><Button size="sm" variant="destructive" onClick={() => { setWorking(`delete-program-${program.id}`); runAction(() => deleteProgram(program.id), "Program deleted."); }}>Delete</Button></div><p className="mt-2 text-xs text-slate-500">ID {program.id} · {program.classes_count || 0} classes</p></article>)}</div>
          )}
        </div> : null}

        {showClasses ? <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-lg font-semibold">Classes</h2>
          <form className="mb-5 grid gap-3 md:grid-cols-2" onSubmit={handleCreateClass}>
            <Input name="subject_name" value={classForm.subject_name} onChange={updateClassForm} placeholder="Subject" aria-label="Subject" required />
            <Input name="section" value={classForm.section} onChange={updateClassForm} placeholder="Section" aria-label="Section" required />
            <Input name="schedule" value={classForm.schedule} onChange={updateClassForm} placeholder="Schedule" aria-label="Schedule" required />
            <select name="instructor_id" aria-label="Instructor" value={classForm.instructor_id} onChange={updateClassForm} required className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select instructor</option>{instructors.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select>
            <select name="program_id" aria-label="Program" value={classForm.program_id} onChange={updateClassForm} required className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">Select program</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.program_name}</option>)}</select>
            <select name="semester" aria-label="Semester" value={classForm.semester} onChange={updateClassForm} required className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="1st">1st semester</option><option value="2nd">2nd semester</option></select>
            <Input name="school_year" value={classForm.school_year} onChange={updateClassForm} placeholder="School year (2026-2027)" aria-label="School year" pattern="[0-9]{4}-[0-9]{4}" required />
            <Button type="submit" disabled={working === "create-class"} className="md:col-span-2">Create class</Button>
          </form>
          {classes.length === 0 ? <EmptyState title="No classes found" /> : (
            <div className="space-y-3">{classes.map((item) => <article key={item.id} className="rounded-lg border border-slate-200 p-3"><div className="flex flex-wrap items-center justify-between gap-3"><span className="font-medium">{item.subject_name}</span><Button size="sm" variant="destructive" onClick={() => { setWorking(`delete-class-${item.id}`); runAction(() => deleteClass(item.id), "Class deleted."); }}>Delete</Button></div><p className="mt-2 text-xs text-slate-500">ID {item.id} · {item.program?.program_name || "Program"}</p></article>)}</div>
          )}
        </div> : null}
      </section> : null}

      {showReports ? <section className="rounded-lg border border-slate-200 bg-white p-5">
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
