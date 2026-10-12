import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRole, normalizeRole, programLabel, valueOrFallback } from "./settingsConfig";

function fieldsFor(user, role) {
  const normalizedRole = normalizeRole(role);
  const fields = [
    { label: "Name", value: user?.name }, { label: "Email", value: user?.email },
    { label: "Account Role", value: formatRole(user?.role) },
  ];
  if (normalizedRole !== normalizeRole(user?.role)) fields.push({ label: "Dashboard Role", value: formatRole(role) });
  if (normalizedRole === "program_head") fields.push({ label: "Program", value: programLabel(user) });
  if (normalizedRole === "instructor") fields.push(
    { label: "Instructor ID", value: user?.employee_id }, { label: "Program", value: programLabel(user) });
  if (normalizedRole === "student") fields.push(
    { label: "Student ID", value: user?.school_student_id },
    { label: "Program / Section", value: programLabel(user) },
    { label: "Year Level", value: user?.year_level });
  return fields;
}

function ProfileFields({ user, role }) {
  return <div className="grid gap-4 md:grid-cols-2">
    {fieldsFor(user, role).map(({ label, value }) => <div key={label} className="grid gap-2">
      <Label className="text-xs font-bold text-slate-700">{label}</Label>
      <Input readOnly value={valueOrFallback(value)}
        className="h-10 rounded-[5px] border-slate-300 bg-slate-50 text-sm font-medium text-slate-800" />
    </div>)}
  </div>;
}

export default ProfileFields;
