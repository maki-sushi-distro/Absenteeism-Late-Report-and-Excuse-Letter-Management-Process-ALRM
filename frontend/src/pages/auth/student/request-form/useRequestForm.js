import { useEffect, useMemo, useRef, useState } from "react"; 
import { createStudentRequest, getStudentClasses, uploadEvidence } from "@/api/studentRequests";
import { useAuth } from "@/context/AuthContext";
import { getStoredProfileSetup } from "@/lib/profileSetup";
import { buildRequestPayload, proofTypeError } from "./buildPayload";
import { LAST_STEP, initialForm } from "./constants";
import { firstInvalidRequestStep, validateStep } from "./validation";
import {
  buildInitialForm,
  profileDefaults,
  yearOptionsForProgram,
} from "./utils";

export default function useRequestForm() {
  const { user, refreshUser } = useAuth();
  const storedProfile = useMemo(() => getStoredProfileSetup(user), [user]);
  const [step, setStep] = useState(0);
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(() =>
    buildInitialForm(initialForm, user, storedProfile),
  );

  const uploadedRef = useRef(null);

  useEffect(() => {
    const defaults = profileDefaults(user, storedProfile);

    // Fill profile-backed fields when the authenticated user arrives.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => {
      const program = current.program || defaults.program;
      const level = current.level || defaults.level;

      return {
        ...current,
        studentName: current.studentName || defaults.studentName,
        program,
        level: yearOptionsForProgram(program).includes(level) ? level : "",
        guardianName: current.guardianName || defaults.guardianName,
        contactNumber: current.contactNumber || defaults.contactNumber,
      };
    });
  }, [storedProfile, user]);

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

    return () => {
      alive = false;
    };
  }, []);

  function updateField(name, value) {
    setForm((current) => {
      if (name === "program") {
        const allowedYears = yearOptionsForProgram(value);

        return {
          ...current,
          program: value,
          level: allowedYears.includes(current.level) ? current.level : "",
        };
      }

      if (name !== "requestType") return { ...current, [name]: value };

      return {
        ...current,
        requestType: value,
        minutesLate: "",
        startDateOfAbsence: "",
        endDateOfAbsence: "",
        reason: "",
        classText: "",
        absenceReasons: [],
        proof_types: [],
        evidenceFile: null,
        declaration: false,
      };
    });
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  }

  function toggleListField(name, value) {
    setForm((current) => {
      const selected = current[name] || [];

      return {
        ...current,
        [name]: selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value],
      };
    });
    setFieldErrors((current) => ({ ...current, [name]: "" }));
    setError("");
  }

  function handleRadioClick(name, value, event) {
    if (form[name] !== value) return;

    event.preventDefault();
    updateField(name, "");
  }

  function runValidation(currentStep = step) {
    const nextErrors = validateStep({
      step: currentStep,
      form,
      classes,
      classesError,
    });

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function nextStep() {
    if (!runValidation()) return;
    setStep((current) => Math.min(current + 1, LAST_STEP));
  }

  function previousStep() {
    setFieldErrors({});
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function resolveEvidence() {
    const file = form.evidenceFile;
    if (!file) return null;

    if (uploadedRef.current?.file === file) return uploadedRef.current;

    const result = await uploadEvidence(file);
    uploadedRef.current = { file, path: result.path, type: result.type };

    return uploadedRef.current;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const invalid = firstInvalidRequestStep(form, classes, classesError);
    if (invalid) {
      setStep(invalid.step);
      setFieldErrors(invalid.errors);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const evidence = await resolveEvidence();
      await createStudentRequest(buildRequestPayload(form, classes, evidence));
      setSubmitted(true);
      refreshUser({ silent: true }).catch(() => {});
    } catch (submitError) {
      setError(submitError?.message || "Unable to submit your request.");
      const proofError = proofTypeError(submitError?.validationErrors || submitError?.body?.errors);
      if (proofError) {
        setFieldErrors((current) => ({ ...current, proof_types: proofError }));
        setStep(5);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    const fresh = buildInitialForm(initialForm, user, storedProfile);

    setForm({
      ...fresh,
      guardianName: form.guardianName || fresh.guardianName,
      contactNumber: form.contactNumber || fresh.contactNumber,
    });
    uploadedRef.current = null; 
    setStep(0);
    setError("");
    setFieldErrors({});
    setSubmitted(false);
  }

  return {
    user,
    step,
    form,
    classes,
    classesLoading,
    classesError,
    submitting,
    submitted,
    error,
    fieldErrors,
    updateField,
    toggleListField,
    handleRadioClick,
    nextStep,
    previousStep,
    handleSubmit,
    resetForm,
  };
}
