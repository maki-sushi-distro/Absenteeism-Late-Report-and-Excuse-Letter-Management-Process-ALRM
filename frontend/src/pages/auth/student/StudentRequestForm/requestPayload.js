import { findClassByText } from "./requestConfig.js";

export function buildStudentRequestPayload(form, classes) {
  const isAbsence = form.requestType === "absence";
  const matchedClass = isAbsence ? findClassByText(classes, form.classText) :
    classes.find((item) => String(item?.class_id) === String(form.classId));
  const reason = isAbsence ? [
    `Reason(s) of absence: ${form.absenceReasons.join(", ")}`,
    `Supporting document(s): ${form.proofTypes.join(", ") || "None selected"}`,
    `Parent/Guardian: ${form.guardianName.trim()}`,
    `Contact: ${form.contactNumber.trim()}`,
  ].join("\n") : [
    `Late by ${form.minutesLate.trim()} minute(s).`, `Reason: ${form.reason.trim()}`,
    `Parent/Guardian: ${form.guardianName.trim()}`, `Contact: ${form.contactNumber.trim()}`,
  ].join("\n");

  return {
    class_id: matchedClass?.class_id || form.classId,
    type: form.requestType,
    subjects_missed: matchedClass?.subject_name || form.classText.trim(),
    minutes_late: isAbsence ? null : Number(form.minutesLate),
    start_date_of_absence: isAbsence ? form.startDateOfAbsence : null,
    end_date_of_absence: isAbsence ? form.endDateOfAbsence : null,
    guardian_name: form.guardianName.trim(),
    contact_number: form.contactNumber.trim(),
    reason, evidence_file_url: null, evidence_type: null,
  };
}
