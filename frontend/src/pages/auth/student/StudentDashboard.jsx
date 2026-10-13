import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStudentAttendanceSummary, getStudentClasses, getStudentRequests } from "@/api/student";
import { useAuth } from "@/context/AuthContext";
import { ErrorState } from "@/components/common/ErrorState";
import { Spinner } from "@/components/ui/spinner";
import StudentAttendanceTracker from "./StudentAttendanceTracker";
import StudentDashboardMetrics from "./StudentDashboardMetrics";
import StudentPageLayout from "./StudentPageLayout";

function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState({ requests: [], attendance: [], classes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadData() {
      try {
        const [requests, attendance, classes] = await Promise.all([
          getStudentRequests(), getStudentAttendanceSummary(), getStudentClasses(),
        ]);
        if (alive) setData({
          requests: Array.isArray(requests) ? requests : [],
          attendance: Array.isArray(attendance) ? attendance : [],
          classes: Array.isArray(classes) ? classes : [],
        });
      } catch (issue) {
        if (alive) setError(issue.message || "Unable to load your dashboard.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    const timer = window.setTimeout(loadData, 0);
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  return <StudentPageLayout>
    <div className="grid gap-6">
      <section>
        <p className="mb-4 text-sm font-black uppercase text-[#0b367f] dark:text-blue-300">Dashboard</p>
        <h1 className="text-2xl font-black text-slate-950 dark:text-slate-50">Welcome back, {user?.name || "Student"}!</h1>
        <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">Here&apos;s your student overview</p>
      </section>
      {loading ? <div className="flex items-center gap-2 text-sm"><Spinner />Loading student records</div> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error ? <>
        <StudentDashboardMetrics {...data} />
        <StudentAttendanceTracker attendance={data.attendance} />
        <div className="flex flex-wrap gap-4 text-sm font-semibold text-[#203b82] dark:text-blue-300">
          <Link to="/student/records">My Records</Link>
          <Link to="/student/request">New Request</Link>
        </div>
      </> : null}
    </div>
  </StudentPageLayout>;
}

export default StudentDashboard;
