import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import Login from "./pages/login";
import Home from "./pages/Home";
import SignedOut from "./pages/auth/SignedOut";
import { AuthCallback } from "./pages/AuthCallback";
import { Dashboard } from "./pages/Dashboard";
import OtpVerification from "./pages/OtpVerification";
import ProfileSetup from "./pages/ProfileSetup";
import AddInstructor from "./pages/auth/admin/AddInstructor";
import AddStudent from "./pages/auth/admin/AddStudent";
import Instructors from "./pages/auth/admin/Instructors";
import AdminPageLayout from "./pages/auth/admin/AdminPageLayout";
import { AdminDashboard as AdminWorkspace } from "./pages/auth/admin/AdminDashboard";
import AdminUserManagement from "./pages/auth/admin/AdminUserManagement";
import AdminProgramOverview from "./pages/auth/admin/AdminProgramOverview";
import AdminActivityLog from "./pages/auth/admin/AdminActivityLog";
import AdminManage from "./pages/auth/admin/AdminManage";
import StudentProfile from "./pages/auth/admin/StudentProfile";
import Students from "./pages/auth/admin/Students";
import Settings from "./pages/auth/Settings";
import Notifications from "./pages/auth/Notifications";
import InstructorClassRecords from "./pages/auth/instructor/InstructorClassRecords";
import InstructorRequests from "./pages/auth/instructor/InstructorRequests";
import { ProgramHeadDashboard as ProgramHeadWorkspace } from "./pages/auth/programHead/ProgramHeadDashboard";
import { ProgramHeadInstructors, ProgramHeadInstructorDetail } from "./pages/auth/programHead/ProgramHeadInstructors";
import { ProgramHeadReports } from "./pages/auth/programHead/ProgramHeadReports";
import ProgramHeadPageLayout from "./pages/auth/programHead/ProgramHeadPageLayout";
import ProgramHeadActivityLog from "./pages/auth/programHead/ProgramHeadActivityLog";
import StudentRecords from "./pages/auth/student/StudentRecords";
import StudentNotificationsPage from "./pages/auth/student/StudentNotificationsPage";
import StudentRequestForm from "./pages/auth/student/StudentRequestForm";
import AppErrorBoundary from "./components/AppErrorBoundary";
import HttpErrorPage from "./pages/HttpErrorPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
        <AuthProvider>
          <AppErrorBoundary>
            <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signed-out" element={<SignedOut />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/verify-otp" element={<OtpVerification />} />
          <Route path="/auth/otp" element={<OtpVerification />} />
          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute allowedIncompleteProfile>
                <ProfileSetup />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Home />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructors"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Instructors />
              </ProtectedRoute>
            }
          />
          <Route path="/user-management" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminUserManagement /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/program-overview" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminProgramOverview /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/activity-log" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminActivityLog /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/manage" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminManage /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminWorkspace view="programs" /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminWorkspace view="classes" /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminWorkspace view="reports" /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/program-head/requests" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadWorkspace view="requests" /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route path="/program-head/flagged" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadWorkspace view="flagged" /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route path="/program-head/instructors" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadInstructors /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route path="/program-head/instructors/:instructorId" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadInstructorDetail /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route path="/program-head/reports" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadReports /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route path="/program-head/activity-log" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadActivityLog /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route
            path="/instructors/add"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AddInstructor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Students />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/add"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AddStudent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students/:studentId"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/class-records"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <InstructorClassRecords />
              </ProtectedRoute>
            }
          />
          <Route path="/instructor/class-records/:classId" element={<ProtectedRoute allowedRoles={["instructor"]}><InstructorClassRecords /></ProtectedRoute>} />
          <Route
            path="/instructor/class-requests"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <InstructorRequests />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/records"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentRecords />
              </ProtectedRoute>
            }
          />
          <Route path="/student/notifications" element={<ProtectedRoute allowedRoles={["student"]}><StudentNotificationsPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route
            path="/student/request"
            element={
              <ProtectedRoute allowedRoles={["student"]}>
                <StudentRequestForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
              <Route path="/400" element={<HttpErrorPage status={400} />} />
              <Route path="/401" element={<HttpErrorPage status={401} />} />
              <Route path="/403" element={<HttpErrorPage status={403} />} />
              <Route path="/404" element={<HttpErrorPage status={404} />} />
              <Route path="/500" element={<HttpErrorPage status={500} />} />
              <Route path="/503" element={<HttpErrorPage status={503} />} />
              <Route path="*" element={<HttpErrorPage status={404} />} />
            </Routes>
          </AppErrorBoundary>
        </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
