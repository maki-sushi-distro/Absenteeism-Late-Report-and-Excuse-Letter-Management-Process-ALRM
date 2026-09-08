import { useEffect, useState } from "react";
import {
  createStudentRequest,
  getStudentAttendanceSummary,
  getStudentClasses,
  getStudentRequests,
} from "@/api/student";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";

const initialForm = {
  class_id: "",
  type: "absence",
  start_date_of_absence: "",
  end_date_of_absence: "",
  reason: "",
  evidence_file_url: "",
  evidence_type: "",
};

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

export function StudentDashboard({ view = "dashboard" }) {
  const [classes, setClasses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [classData, requestData, attendanceData] = await Promise.all([
        getStudentClasses(),
        getStudentRequests(),
        getStudentAttendanceSummary(),
      ]);
      setClasses(classData || []);
      setRequests(requestData || []);
      setAttendance(attendanceData || []);
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

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitRequest(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await createStudentRequest({
        class_id: Number(form.class_id),
        type: form.type,
        start_date_of_absence: form.start_date_of_absence,
        end_date_of_absence: form.end_date_of_absence || null,
        reason: form.reason,
        evidence_file_url: form.evidence_file_url || null,
        evidence_type: form.evidence_type || null,
      });
      setForm(initialForm);
      setNotice("Request submitted.");
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-slate-600">
        <Spinner />
        Loading student records
      </div>
    );
  }

  const showForm = view === "dashboard" || view === "new-request";
  const showTracker = view === "dashboard";
  const showHistory = view === "dashboard" || view === "requests";

  return (
    <div className={showForm && showTracker ? "grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" : "space-y-6"}>
      {showForm ? <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Submit request</h2>
        {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
        {notice ? <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p> : null}
        <form className="mt-5 space-y-4" onSubmit={submitRequest}>
          <div className="space-y-2">
            <Label htmlFor="class_id">Class</Label>
            <select id="class_id" name="class_id" value={form.class_id} onChange={updateField} required className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <option value="">Select class</option>
              {classes.map((item) => <option key={item.class_id} value={item.class_id}>{item.subject_name}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <select id="type" name="type" value={form.type} onChange={updateField} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">
                <option value="absence">Absence</option>
                <option value="late">Late</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="start_date_of_absence">Date</Label>
              <Input id="start_date_of_absence" name="start_date_of_absence" type="date" value={form.start_date_of_absence} onChange={updateField} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <textarea id="reason" name="reason" value={form.reason} onChange={updateField} required rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          <Input name="end_date_of_absence" type="date" value={form.end_date_of_absence} onChange={updateField} aria-label="End date" />
          <Input name="evidence_type" value={form.evidence_type} onChange={updateField} placeholder="Evidence type" />
          <Input name="evidence_file_url" value={form.evidence_file_url} onChange={updateField} placeholder="Evidence link" />
          <Button type="submit" disabled={submitting || classes.length === 0} className="w-full">
            {submitting ? <Spinner /> : null}
            Submit request
          </Button>
        </form>
      </section> : null}

      <div className="space-y-6">
        {showTracker ? <section>
          <h2 className="mb-3 text-lg font-semibold">Threshold tracker</h2>
          {attendance.length === 0 ? <EmptyState title="No attendance records" /> : (
            <div className="grid gap-3 md:grid-cols-2">
              {attendance.map((item) => (
                <article key={item.class_id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex justify-between gap-3">
                    <h3 className="font-semibold">{item.subject_name}</h3>
                    <StatusBadge value={item.tracker?.status || "safe"} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">Lates: {item.tracker?.total_lates || 0} · Absences: {item.tracker?.total_absences || 0} · Converted: {item.tracker?.converted_absences || 0}</p>
                </article>
              ))}
            </div>
          )}
        </section> : null}
        {showHistory ? <section>
          <h2 className="mb-3 text-lg font-semibold">Request history</h2>
          {requests.length === 0 ? <EmptyState title="No requests submitted" /> : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <tbody className="divide-y divide-slate-100">
                  {requests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-4 py-3">{request.enrollment?.class?.subject_name || "Class"}</td>
                      <td className="px-4 py-3 capitalize">{request.type}</td>
                      <td className="px-4 py-3">{formatDate(request.start_date_of_absence)}</td>
                      <td className="px-4 py-3"><StatusBadge value={request.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section> : null}
      </div>
    </div>
  );
}
