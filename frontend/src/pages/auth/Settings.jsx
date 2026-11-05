import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  LockKeyhole,
  Settings as SettingsIcon,
  UserRound,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { getStoredProfileSetup } from "@/lib/profileSetup";
import AdminPageLayout from "./admin/AdminPageLayout";
import InstructorPageLayout from "./instructor/InstructorPageLayout";
import ProgramHeadPageLayout from "./programHead/ProgramHeadPageLayout";
import StudentPageLayout from "./student/StudentPageLayout";
import StudentSettings from "./student/StudentSettings";
import LoadingSkeleton from "@/components/loading/LoadingSkeleton";
import { getAcademicPeriod, isConsecutiveSchoolYear, updateAcademicPeriod } from "@/api/academicPeriod";

const ROLE_CONFIG = {
  administrator: {
    pageTitle: "Settings",
    pageDescription:
      "Manage your faculty profile information, notification preferences, and attendance settings.",
    profileTitle: "Admin Profile",
    profileDescription: "Your ALRM administrator account details.",
    preferencesTitle: "Notification Channel",
    preferencesDescription:
      "System notification channels currently supported by the backend.",
  },
  program_head: {
    pageTitle: "Settings",
    pageDescription: "Manage your program profile and preferences.",
    profileTitle: "Program Profile",
    profileDescription: "Your ALRM program account details.",
    preferencesTitle: "Program Preferences",
    preferencesDescription:
      "Notifications related to students, requests, and escalations in your program.",
  },
  instructor: {
    pageTitle: "Settings",
    pageDescription: "Manage your instructor profile and notification settings.",
    profileTitle: "Instructor Profile",
    profileDescription: "Your ALRM instructor account details.",
    preferencesTitle: "Notification Preferences",
    preferencesDescription:
      "Notifications for student excuse letters, late reports, and attendance updates.",
  },
  student: {
    pageTitle: "Settings",
    pageDescription: "Manage your student profile and notification settings.",
    profileTitle: "Student Profile",
    profileDescription: "Your ALRM student account details.",
    preferencesTitle: "Notification Preferences",
    preferencesDescription:
      "Notifications for request updates and attendance-related account activity.",
  },
};

const roleAliases = {
  admin: "administrator",
  administrator: "administrator",
  program: "program_head",
  program_head: "program_head",
  "program-head": "program_head",
  "program head": "program_head",
  instructor: "instructor",
  student: "student",
};

function normalizeRole(role) {
  const key = String(role || "")
    .trim()
    .toLowerCase();

  return roleAliases[key] || null;
}

function formatRole(role) {
  const normalized = normalizeRole(role);

  if (normalized === "administrator") return "Admin";
  if (normalized === "program_head") return "Program";
  if (normalized === "instructor") return "Instructor";
  if (normalized === "student") return "Student";

  return role || "Unknown";
}

function valueOrFallback(value, fallback = "Not available") {
  if (value === null || value === undefined || value === "") return fallback;

  return String(value);
}

function programLabel(user) {
  const names = (user?.programs ?? [])
    .map((program) => program.program_name)
    .filter(Boolean);

  return (
    user?.program?.program_name ||
    user?.headed_program?.program_name ||
    (names.length ? names.join(", ") : null) ||
    user?.program_name ||
    "Not assigned"
  );
}

function schoolStudentId(user, storedSetup) {
  return (
    storedSetup?.student_number ||
    storedSetup?.studentNumber ||
    storedSetup?.student_id ||
    user?.school_id_number ||
    user?.student_number ||
    user?.studentNumber ||
    user?.school_id ||
    user?.schoolId ||
    user?.student_id_number ||
    user?.studentIdNumber ||
    ""
  );
}

function yearLevel(user, storedSetup) {
  return (
    storedSetup?.year_level ||
    storedSetup?.yearLevel ||
    user?.year_level ||
    user?.yearLevel ||
    ""
  );
}

function userInitials(name) {
  const parts = String(name || "ALRM")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="grid gap-2">
      <Label className="text-xs font-bold text-slate-700">{label}</Label>
      <Input
        readOnly
        value={valueOrFallback(value)}
        className="h-10 rounded-[5px] border-slate-300 bg-slate-50 text-sm font-medium text-slate-800"
      />
    </div>
  );
}

function AdminProfileField({ id, label, value }) {
  const displayValue = valueOrFallback(value);
  return (
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={id} className="text-[13px] font-medium text-[#171717]">
        {label}
      </Label>
      <div className="relative min-w-0">
        <Input
          id={id}
          readOnly
          title={displayValue}
          value={displayValue}
          className="h-9 rounded-[5px] border-0 bg-[#e6efff] pr-9 text-[13px] font-normal text-[#46546a] shadow-none"
        />
        <LockKeyhole
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-[#6d7c91]"
        />
      </div>
    </div>
  );
}

function AdminProfileSection({ user }) {
  const fields = [
    { id: "admin-full-name", label: "Full Name", value: user?.name },
    { id: "admin-faculty-id", label: "Faculty ID", value: user?.school_id_number },
    { id: "admin-department", label: "Department", value: programLabel(user) },
    { id: "admin-email", label: "Email Address", value: user?.email },
  ];

  return (
    <section
      aria-labelledby="admin-profile-title"
      className="border-b border-[#9eb2d4] px-0 pb-12 pt-9 sm:px-8"
    >
      <h2
        id="admin-profile-title"
        className="mb-4 flex h-7 items-center gap-2 rounded-[5px] bg-[#e6efff] px-2 text-[14px] font-medium text-[#26364f]"
      >
        <UserRound aria-hidden="true" className="size-4 text-[#3186ff]" strokeWidth={1.9} />
        Faculty Profile
      </h2>
      <div className="grid gap-x-4 gap-y-4 md:grid-cols-2">
        {fields.map((field) => <AdminProfileField key={field.id} {...field} />)}
      </div>
    </section>
  );
}

function SettingsCard({ icon: Icon, title, description, children }) {
  return (
    <Card className="rounded-[6px] border border-slate-200 bg-white py-0 shadow-none ring-0">
      <CardHeader className="border-b border-slate-100 px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[6px] bg-[#203b82]/10 text-[#203b82]">
            <Icon className="size-5" strokeWidth={2.1} />
          </div>
          <div>
            <CardTitle className="text-base font-black text-slate-950">
              {title}
            </CardTitle>
            <CardDescription className="mt-1 text-sm text-slate-600">
              {description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5 sm:px-6">{children}</CardContent>
    </Card>
  );
}

function ProfileCard({ user, config, role }) {
  const normalizedRole = normalizeRole(role);
  const storedSetup = getStoredProfileSetup(user);
  const fields = [
    { label: "Name", value: user?.name },
    { label: "Email", value: user?.email },
    { label: "Role", value: formatRole(user?.role) },
  ];

  if (normalizedRole === "program_head") {
    fields.push({ label: "Program", value: programLabel(user, storedSetup) });
  }

  if (normalizedRole === "instructor") {
    fields.push({ label: "Instructor ID", value: user?.employee_id });
    fields.push({ label: "Program", value: programLabel(user) });
  }

  if (normalizedRole === "student") {
    fields.push({ label: "Student ID", value: schoolStudentId(user, storedSetup) });
    fields.push({ label: "Program / Section", value: programLabel(user) });
    fields.push({ label: "Year Level", value: yearLevel(user, storedSetup) });
  }

  return (
    <SettingsCard
      icon={UserRound}
      title={config.profileTitle}
      description={config.profileDescription}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 bg-slate-100 text-slate-700">
            <AvatarFallback className="text-lg font-black">
              {userInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-black text-slate-950">
              {valueOrFallback(user?.name, "Current user")}
            </p>
            <p className="text-sm font-medium text-slate-600">
              {valueOrFallback(user?.email)}
            </p>
          </div>
        </div>

      </div>

      <Separator className="my-5" />

      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <ReadOnlyField key={field.label} label={field.label} value={field.value} />
        ))}
      </div>
    </SettingsCard>
  );
}

function AdminPolicyCard() {
  const [period, setPeriod] = useState({ semester: "1st", school_year: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getAcademicPeriod()
      .then((data) => { if (active) setPeriod({ semester: data.semester, school_year: data.school_year }); })
      .catch((requestError) => { if (active) setError(requestError.message || "Could not load the academic period."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function savePeriod(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    const schoolYear = period.school_year.trim();
    if (!isConsecutiveSchoolYear(schoolYear)) {
      setError("Enter two consecutive years, for example 2026-2027.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateAcademicPeriod({ ...period, school_year: schoolYear });
      setPeriod(updated);
      setMessage("Academic period saved.");
    } catch (requestError) {
      setError(requestError.message || "Could not save the academic period.");
    } finally {
      setSaving(false);
    }
  }
  const policies = [
    {
      label: "Late conversion",
      value: "3 late reports = 1 converted absence",
    },
    {
      label: "Warning threshold",
      value: "2 converted absences",
    },
    {
      label: "IR threshold",
      value: "3 converted absences",
    },
    {
      label: "Policy management",
      value: "Read-only in frontend",
    },
  ];

  return (
    <SettingsCard
      icon={SettingsIcon}
      title="Absenteeism & Late Policy"
      description="Current attendance policy behavior enforced by the backend."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {policies.map((policy) => (
          <div
            key={policy.label}
            className="rounded-[5px] border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs font-bold uppercase text-slate-500">
              {policy.label}
            </p>
            <p className="mt-1 text-sm font-black text-slate-950">
              {policy.value}
            </p>
          </div>
        ))}
      </div>
      <Separator className="my-5" />
      <form className="grid gap-4" onSubmit={savePeriod}>
        <div><p className="text-sm font-black text-slate-950">Academic period</p><p className="mt-1 text-sm text-slate-600">This period is used by attendance and reporting workflows.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2"><Label htmlFor="academic-semester">Semester</Label><select id="academic-semester" value={period.semester} onChange={(event) => setPeriod((current) => ({ ...current, semester: event.target.value }))} disabled={loading || saving} className="h-10 rounded-[5px] border border-slate-300 bg-white px-3 text-sm"><option value="1st">1st Semester</option><option value="2nd">2nd Semester</option></select></div>
          <div className="grid gap-2"><Label htmlFor="academic-school-year">School year</Label><Input id="academic-school-year" value={period.school_year} onChange={(event) => setPeriod((current) => ({ ...current, school_year: event.target.value }))} placeholder="2026-2027" disabled={loading || saving} /></div>
        </div>
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        {message && <p role="status" className="text-sm font-semibold text-emerald-700">{message}</p>}
        <Button type="submit" className="w-fit bg-[#172f6b] text-white hover:bg-[#203f8a]" disabled={loading || saving}>{saving ? "Saving..." : "Save academic period"}</Button>
      </form>
    </SettingsCard>
  );
}

function SettingsLayout({ children, role }) {
  if (normalizeRole(role) === "program_head") {
    return <ProgramHeadPageLayout>{children}</ProgramHeadPageLayout>;
  }

  if (normalizeRole(role) === "instructor") {
    return <InstructorPageLayout>{children}</InstructorPageLayout>;
  }

  if (normalizeRole(role) === "student") {
    return <StudentPageLayout>{children}</StudentPageLayout>;
  }

  return <AdminPageLayout>{children}</AdminPageLayout>;
}

function UnknownRoleState({ role }) {
  return (
    <SettingsLayout role={role}>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-black tracking-normal text-slate-950">
          Settings
        </h1>
        <Alert variant="destructive" className="mt-5">
          <AlertCircle className="size-4" />
          <AlertTitle>Settings unavailable</AlertTitle>
          <AlertDescription>
            Your account role ({valueOrFallback(role, "unknown")}) is not
            supported by the Settings page. Please contact an administrator.
          </AlertDescription>
        </Alert>
      </div>
    </SettingsLayout>
  );
}

function Settings() {
  const { user, loading, refreshUser } = useAuth();

  const normalizedRole = useMemo(() => normalizeRole(user?.role), [user?.role]);
  const config = normalizedRole ? ROLE_CONFIG[normalizedRole] : null;

  if (loading) {
    return (
      <SettingsLayout role={user?.role}>
        <LoadingSkeleton variant="profile" label="Loading settings..." rows={6} />
      </SettingsLayout>
    );
  }

  if (!config) {
    return <UnknownRoleState role={user?.role} />;
  }

  if (normalizedRole === "student") {
    return <StudentPageLayout><StudentSettings key={user?.id} user={user} /></StudentPageLayout>;
  }

  return (
    <SettingsLayout role={user?.role}>
      <div className="mx-auto grid max-w-6xl gap-5">
        <div>
          <h1 className={`${normalizedRole === "administrator" ? "text-xl font-bold" : "text-2xl font-black"} tracking-normal text-slate-950`}>
            {config.pageTitle}
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {config.pageDescription}
          </p>
        </div>

        <div className={normalizedRole === "administrator" ? "grid gap-0" : "grid gap-5"}>
          {normalizedRole === "administrator" ? (
            <AdminProfileSection user={user} />
          ) : (
            <ProfileCard user={user} role={user?.role} config={config} />
          )}
          <NotificationPreferences key={user?.id} user={user} role={normalizedRole} onEmailSaved={() => refreshUser({ silent: true })} />
          {normalizedRole === "administrator" && <div className="pt-5"><AdminPolicyCard /></div>}
        </div>
      </div>
    </SettingsLayout>
  );
}

export default Settings;
