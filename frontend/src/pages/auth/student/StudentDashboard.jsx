import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getStudentAttendanceSummary, getStudentClasses, getStudentRequests } from "@/api/student";
import { useAuth } from "@/context/AuthContext";
import { ErrorState } from "@/components/common/ErrorState";
import { Spinner } from "@/components/ui/spinner";
import StudentDashboardMetrics from "./StudentDashboardMetrics";
import StudentPageLayout from "./StudentPageLayout";
import StudentDashboardHeading from "./dashboard/StudentDashboardHeading";
import RecentNotifications from "./dashboard/RecentNotifications";
import useStudentPreferences from "./useStudentPreferences";

function StudentDashboard() {
  const { user } = useAuth();
  const { preferences } = useStudentPreferences(user?.id);
  const { hash } = useLocation();
  const [data, setData] = useState({ requests: [], attendance: [], classes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function loadData() {
      setLoading(true);
      setError("");
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
  }, [user?.id]);

  useEffect(() => {
    if (!loading && hash === "#recent-notifications") {
      document.getElementById("recent-notifications")?.focus();
    }
  }, [hash, loading]);

  return <StudentPageLayout contentPadding="px-[50px]">
    <div className="@container grid w-full gap-0 font-[Arial,sans-serif] text-black dark:text-slate-100">
      <StudentDashboardHeading user={user} classes={data.classes} />
      {loading ? <div className="flex items-center gap-2 text-sm"><Spinner />Loading student records</div> : null}
      {error ? <ErrorState message={error} /> : null}
      {!loading && !error ? <>
        <StudentDashboardMetrics {...data} alertsEnabled={preferences.thresholdAlerts} />
        <RecentNotifications userId={user?.id} requests={data.requests} />
      </> : null}
    </div>
  </StudentPageLayout>;
}

export default StudentDashboard;
