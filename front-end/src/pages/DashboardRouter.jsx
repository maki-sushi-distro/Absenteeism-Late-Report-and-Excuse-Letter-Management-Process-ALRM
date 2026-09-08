import { useEffect } from "react";
import { useAuth } from "@/auth/useAuth";
import { AccessDenied } from "@/pages/AccessDenied";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminDashboard } from "./admin/AdminDashboard";
import { InstructorDashboard } from "./instructor/InstructorDashboard";
import { ProgramHeadDashboard } from "./program-head/ProgramHeadDashboard";
import { StudentDashboard } from "./student/StudentDashboard";

const titles = {
  student: {
    title: "My Attendance Requests",
    subtitle: "Submit absence or late requests and track attendance thresholds.",
  },
  instructor: {
    title: "Class Request Review",
    subtitle: "Review requests for your classes and monitor warning or IR thresholds.",
  },
  program_head: {
    title: "Program Monitoring",
    subtitle: "Watch program-wide requests, flagged students, and escalation status.",
  },
  administrator: {
    title: "College Administration",
    subtitle: "Assign staff roles, manage programs and classes, and export reports.",
  },
};

const roleHome = {
  student: "/student",
  instructor: "/instructor",
  program_head: "/program-head",
  administrator: "/admin",
};

const routes = {
  student: {
    "/student": { view: "dashboard", title: "My Attendance Requests", subtitle: titles.student.subtitle },
    "/student/requests/new": { view: "new-request", title: "Submit Request", subtitle: "File an absence or late request for one of your enrolled classes." },
    "/student/requests": { view: "requests", title: "Request History", subtitle: "Review submitted requests and their instructor decisions." },
  },
  instructor: {
    "/instructor": { view: "dashboard", title: "Class Request Review", subtitle: titles.instructor.subtitle },
    "/instructor/requests": { view: "requests", title: "Requests for Review", subtitle: "Approve, note, or invalidate pending class requests." },
  },
  program_head: {
    "/program-head": { view: "dashboard", title: "Program Monitoring", subtitle: titles.program_head.subtitle },
    "/program-head/students/flagged": { view: "flagged", title: "Flagged Students", subtitle: "Monitor escalated students and follow-up status." },
    "/program-head/requests": { view: "requests", title: "Program Requests", subtitle: "Review absence and late requests across your program." },
  },
  administrator: {
    "/admin": { view: "dashboard", title: "College Administration", subtitle: titles.administrator.subtitle },
    "/admin/users": { view: "users", title: "Staff Role Assignment", subtitle: "Assign pending staff accounts to their ALRM roles." },
    "/admin/programs": { view: "programs", title: "Programs", subtitle: "Manage academic programs and assigned program heads." },
    "/admin/classes": { view: "classes", title: "Classes", subtitle: "Manage subjects, instructors, schedules, and program links." },
    "/admin/reports": { view: "reports", title: "Reports", subtitle: "Export request records for accreditation and review." },
  },
};

export function DashboardRouter({ navigate, path }) {
  const { user } = useAuth();
  const home = roleHome[user.role] || "/login";
  const route = routes[user.role]?.[path];

  useEffect(() => {
    if (path === "/") {
      navigate(home);
    }
  }, [home, navigate, path]);

  if (path === "/") {
    return null;
  }

  if (!route) {
    return (
      <AccessDenied
        title="Page not available"
        message="This page is not part of your assigned ALRM workspace."
      />
    );
  }

  return (
    <AppLayout
      title={route.title}
      subtitle={route.subtitle}
      activePath={path}
      navigate={navigate}
    >
      {user.role === "student" ? <StudentDashboard view={route.view} /> : null}
      {user.role === "instructor" ? <InstructorDashboard view={route.view} /> : null}
      {user.role === "program_head" ? <ProgramHeadDashboard view={route.view} /> : null}
      {user.role === "administrator" ? <AdminDashboard view={route.view} /> : null}
    </AppLayout>
  );
}
