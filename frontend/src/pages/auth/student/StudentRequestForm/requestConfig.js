export const requestOptions = [
  { label: "Student Late Form", value: "late" },
  { label: "Student Absence Form", value: "absence" },
];

export const associateProgram = "Associate in Computer Technology";
export const programOptions = [associateProgram, "BA in Broadcasting", "BS in Accountancy",
  "BS in Accountancy Information Systems", "BS in Information Systems", "BS in Social Work"];
const yearOptions = ["1st year", "2nd year", "3rd year", "4th year"];
export const absenceReasonOptions = ["Illness / Medical Condition", "Family Emergency",
  "Official School Activity", "Personal Reason", "Others"];
export const proofOptions = ["Medical Certificate", "Prescription / Medical Record",
  "Death Certificate / Funeral Notice", "School Activity Endorsement",
  "Letter from Parent/Guardian", "Others"];

export const initialForm = {
  requestType: "", consent: "", studentName: "", program: "", level: "",
  guardianName: "", contactNumber: "", dateSubmitted: "", minutesLate: "",
  startDateOfAbsence: "", endDateOfAbsence: "", classId: "", classText: "",
  reason: "", absenceReasons: [], proofTypes: [], evidenceFile: null, declaration: false,
};

export const today = () => new Date().toISOString().slice(0, 10);
export const requestTitle = (type) => type === "absence" ? "Student Absence Form" : "Student Late Form";
export const flowSteps = (type) => ["Request", "Instructions", "Privacy", "Student Info",
  type === "absence" ? "Absence Details" : "Late Details", "Attachment", "Review"];
export const yearOptionsForProgram = (program) => program === associateProgram ? yearOptions.slice(0, 2) : yearOptions;

export function normalizePhoneInput(value) {
  const trimmed = String(value || "").trim();
  if (trimmed.startsWith("+")) return `+${trimmed.slice(1).replace(/\D/g, "").slice(0, 12)}`;
  return trimmed.replace(/\D/g, "").slice(0, 11);
}

export function classLabel(item) {
  const instructor = item?.instructor?.name ? ` - ${item.instructor.name}` : "";
  const schedule = item?.schedule ? ` (${item.schedule})` : "";
  return `${item?.subject_name || "Unnamed Class"}${schedule}${instructor}`;
}

export function findClassByText(classes, text) {
  const normalized = String(text || "").trim().toLowerCase();
  if (!normalized) return null;
  return classes.find((item) => classLabel(item).toLowerCase() === normalized ||
    String(item?.subject_name || "").toLowerCase() === normalized);
}

export function controlClass(hasError, className = "") {
  return [className,
    "border-[1.5px] bg-[#FBFBFD] transition-colors focus-visible:border-[#101C4A] focus-visible:ring-[#101C4A]/15",
    hasError ? "border-red-500 ring-2 ring-red-100 focus-visible:border-red-500 focus-visible:ring-red-100" : "border-slate-200",
  ].filter(Boolean).join(" ");
}
