import { useEffect, useMemo, useState } from "react";
import { createStudentRequest, getStudentClasses } from "@/api/studentRequests";
import { getStoredProfileSetup } from "@/lib/profileSetup";
import { findClassByText, initialForm, today, yearOptionsForProgram } from "./requestConfig";
import { validateRequestStep } from "./requestValidation";

export function useStudentRequestForm(user) {
  const storedProfile = useMemo(() => getStoredProfileSetup(user), [user]);
  const [step, setStep] = useState(0);
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({ ...initialForm, studentName: user?.name || "",
    program: storedProfile?.program_name || "", level: storedProfile?.year_level || "", dateSubmitted: today() });

  useEffect(() => {
    let alive = true;
    async function loadClasses() {
      setClassesLoading(true);
      setClassesError("");
      try {
        const data = await getStudentClasses();
        if (alive) setClasses(data);
      } catch (loadError) {
        if (alive) {
          setClasses([]);
          setClassesError(loadError?.message || "Unable to load your classes.");
        }
      } finally {
        if (alive) setClassesLoading(false);
      }
    }
    loadClasses();
    return () => { alive = false; };
  }, []);

  function updateField(name, value) {
    setForm((current) => {
      if (name === "program") {
        const allowedYears = yearOptionsForProgram(value);
        return { ...current, program: value, level: allowedYears.includes(current.level) ? current.level : "" };
      }
      if (name !== "requestType") return { ...current, [name]: value };
      return { ...current, requestType: value, minutesLate: "", startDateOfAbsence: "",
        endDateOfAbsence: "", reason: "", classText: "", absenceReasons: [], proofTypes: [],
        evidenceFile: null, declaration: false };
    });
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  }

  function toggleListField(name, value) {
    setForm((current) => {
      const selected = current[name] || [];
      return { ...current, [name]: selected.includes(value)
        ? selected.filter((item) => item !== value) : [...selected, value] };
    });
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  }

  function handleRadioClick(name, value, event) {
    if (form[name] !== value) return;
    event.preventDefault();
    updateField(name, "");
  }

  function validateStep(currentStep = step) {
    const nextErrors = validateRequestStep(form, currentStep, classes, classesError);
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextStep() {
    if (validateStep()) setStep((current) => Math.min(current + 1, 6));
  }

  function previousStep() {
    setFieldErrors({});
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validateStep(6)) return;
    const isAbsence = form.requestType === "absence";
    const reason = isAbsence ? [
      `Reason(s) of absence: ${form.absenceReasons.join(", ")}`,
      `Supporting document(s): ${form.proofTypes.join(", ") || "None selected"}`,
      `Parent/Guardian: ${form.guardianName.trim()}`,
      `Contact: ${form.contactNumber.trim()}`,
    ].join("\n") : [
      `Late by ${form.minutesLate.trim()} minute(s).`, `Reason: ${form.reason.trim()}`,
      `Parent/Guardian: ${form.guardianName.trim()}`, `Contact: ${form.contactNumber.trim()}`,
    ].join("\n");
    setSubmitting(true);
    setError("");
    try {
      const matchedClass = isAbsence ? findClassByText(classes, form.classText) :
        classes.find((item) => String(item?.class_id) === String(form.classId));
      await createStudentRequest({ class_id: matchedClass?.class_id || form.classId,
        type: form.requestType, subjects_missed: matchedClass?.subject_name || form.classText.trim(),
        minutes_late: isAbsence ? null : Number(form.minutesLate),
        start_date_of_absence: isAbsence ? form.startDateOfAbsence : null,
        end_date_of_absence: isAbsence ? form.endDateOfAbsence : null,
        reason, evidence_file_url: null, evidence_type: null });
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError?.message || "Unable to submit your request.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({ ...initialForm, studentName: user?.name || "",
      program: storedProfile?.program_name || "", level: storedProfile?.year_level || "", dateSubmitted: today() });
    setStep(0);
    setError("");
    setFieldErrors({});
    setSubmitted(false);
  }

  return { step, classes, classesLoading, classesError, submitting, submitted,
    error, fieldErrors, form, updateField, toggleListField, handleRadioClick,
    nextStep, previousStep, handleSubmit, resetForm };
}
