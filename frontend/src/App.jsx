import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import Login from "./pages/login";
import { AuthCallback } from "./pages/AuthCallback";
import { Dashboard } from "./pages/Dashboard";
import OtpVerification from "./pages/OtpVerification";
import ProfileSetup from "./pages/ProfileSetup";
import AddInstructor from "./pages/auth/admin/AddInstructor";
import AddStudent from "./pages/auth/admin/AddStudent";
import Instructors from "./pages/auth/admin/Instructors";
import AdminPageLayout from "./pages/auth/admin/AdminPageLayout";
import { AdminDashboard as AdminWorkspace } from "./pages/auth/admin/AdminDashboard";
import StudentProfile from "./pages/auth/admin/StudentProfile";
import Students from "./pages/auth/admin/Students";
import Settings from "./pages/auth/Settings";
import InstructorPageLayout from "./pages/auth/instructor/InstructorPageLayout";
import { InstructorDashboard as InstructorWorkspace } from "./pages/auth/instructor/InstructorDashboard";
import { ProgramHeadDashboard as ProgramHeadWorkspace } from "./pages/auth/programHead/ProgramHeadDashboard";
import { ProgramHeadInstructors, ProgramHeadInstructorDetail } from "./pages/auth/programHead/ProgramHeadInstructors";
import { ProgramHeadReports } from "./pages/auth/programHead/ProgramHeadReports";
import ProgramHeadPageLayout from "./pages/auth/programHead/ProgramHeadPageLayout";
import StudentRecords from "./pages/auth/student/StudentRecords";
import StudentRequestForm from "./pages/auth/student/StudentRequestForm";
import AppErrorBoundary from "./components/AppErrorBoundary";
import HttpErrorPage from "./pages/HttpErrorPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppErrorBoundary>
            <Routes>
          <Route path="/login" element={<Login />} />
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
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
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
          <Route path="/user-management" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminWorkspace view="users" /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/programs" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminWorkspace view="programs" /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/classes" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminWorkspace view="classes" /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPageLayout><AdminWorkspace view="reports" /></AdminPageLayout></ProtectedRoute>} />
          <Route path="/program-head/requests" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadWorkspace view="requests" /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route path="/program-head/flagged" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadWorkspace view="flagged" /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route path="/program-head/instructors" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadInstructors /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route path="/program-head/instructors/:instructorId" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadInstructorDetail /></ProgramHeadPageLayout></ProtectedRoute>} />
          <Route path="/program-head/reports" element={<ProtectedRoute allowedRoles={["program"]}><ProgramHeadPageLayout><ProgramHeadReports /></ProgramHeadPageLayout></ProtectedRoute>} />
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
                <InstructorPageLayout><InstructorWorkspace view="dashboard" /></InstructorPageLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/instructor/class-requests"
            element={
              <ProtectedRoute allowedRoles={["instructor"]}>
                <InstructorPageLayout><InstructorWorkspace view="requests" /></InstructorPageLayout>
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
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
