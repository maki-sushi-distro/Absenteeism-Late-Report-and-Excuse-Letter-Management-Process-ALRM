import AdminPageLayout from "../admin/AdminPageLayout";
import InstructorPageLayout from "../instructor/InstructorPageLayout";
import StudentPageLayout from "../student/StudentPageLayout";
import ProgramHeadPageLayout from "../programHead/ProgramHeadPageLayout";
import { normalizeRole } from "./settingsConfig";

function SettingsLayout({ children, role }) {
  switch (normalizeRole(role)) {
    case "program_head": return <ProgramHeadPageLayout>{children}</ProgramHeadPageLayout>;
    case "instructor": return <InstructorPageLayout>{children}</InstructorPageLayout>;
    case "student": return <StudentPageLayout>{children}</StudentPageLayout>;
    default: return <AdminPageLayout>{children}</AdminPageLayout>;
  }
}

export default SettingsLayout;
