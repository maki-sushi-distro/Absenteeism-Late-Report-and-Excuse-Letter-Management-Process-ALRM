import { useEffect, useMemo, useRef, useState } from "react"; 
import { createStudentRequest, getStudentClasses, uploadEvidence } from "@/api/studentRequests";
import { useAuth } from "@/context/AuthContext";
import { getStoredProfileSetup } from "@/lib/profileSetup";
import { buildRequestPayload, proofTypeError } from "./buildPayload";
import { EVIDENCE, LAST_STEP, LIMITS, initialForm } from "./constants";
import { firstInvalidRequestStep, validateReview, validateStep } from "./validation";
import { validateEvidenceFile } from "./evidenceValidation";
import { compressImage } from "./imageCompress";
import {
  buildInitialForm,
  profileDefaults,
} from "./utils";

export default function useRequestForm() {
  const { user, refreshUser } = useAuth();
  const storedProfile = useMemo(() => getStoredProfileSetup(user), [user]);
  const [step, setStep] = useState(0);
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewEditing, setReviewEditing] = useState(false);
  const [reviewProcessing, setReviewProcessing] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState(() =>
    buildInitialForm(initialForm, user, storedProfile),
  );

  const uploadedRef = useRef(null);
  const reviewProcessingRef = useRef(false);

  useEffect(() => {
    const defaults = profileDefaults(user, storedProfile);

    // Keep identity tied to the saved profile, including after a refresh.
    setForm((current) => {
      return {
        ...current,
        studentName: defaults.studentName,
        program: defaults.program,
        level: defaults.level,
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
    if (["studentName", "program", "level"].includes(name)) return;
    if (name === "guardianName" && /\p{N}/u.test(value)) return;
    if (["guardianName", "reason"].includes(name) && value.length > LIMITS[name]) return;
    setForm((current) => {
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
    if (submitting || reviewProcessing) return;
    setReviewEditing(false);
    setFieldErrors({});
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  function startReviewEdit() {
    if (submitting || submitted || step !== LAST_STEP) return;
    setFieldErrors({});
    setError("");
    setForm((current) => ({ ...current, declaration: false }));
    setReviewEditing(true);
  }

  function saveReviewEdit() {
    if (submitting || reviewProcessingRef.current) return;
    const errors = validateReview(form, classes, classesError);
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) setReviewEditing(false);
  }

  async function selectReviewFile(picked) {
    if (!picked || reviewProcessingRef.current || submitting) return;
    reviewProcessingRef.current = true;
    setReviewProcessing(true);
    try {
      const file = await compressImage(await validateEvidenceFile(picked));
      if (file.size > EVIDENCE.maxBytes) throw new Error("File is too large after resizing. Maximum upload size is 2MB.");
      updateField("evidenceFile", file);
    } catch (issue) {
      setFieldErrors((current) => ({ ...current, evidenceFile: issue.message || "Unable to process this file." }));
    } finally {
      reviewProcessingRef.current = false;
      setReviewProcessing(false);
    }
  }

  async function resolveEvidence() {
    const file = form.evidenceFile;
    if (!file) return null;

    if (uploadedRef.current?.file === file) return uploadedRef.current;

    setUploading(true);
    try {
      const result = await uploadEvidence(file);
      uploadedRef.current = { file, path: result.path, type: result.type };
      return uploadedRef.current;
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || reviewProcessingRef.current) return;
    if (reviewEditing) {
      saveReviewEdit();
      return;
    }

    const invalid = firstInvalidRequestStep(form, classes, classesError);
    if (invalid) {
      if (step === LAST_STEP) {
        setFieldErrors({ ...validateReview(form, classes, classesError), ...validateStep({ step: LAST_STEP, form, classes, classesError }) });
        if (invalid.step !== LAST_STEP) setReviewEditing(true);
      } else {
        setStep(invalid.step);
        setFieldErrors(invalid.errors);
      }
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
        if (step === LAST_STEP) setReviewEditing(true);
        else setStep(5);
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
    setReviewEditing(false);
  }

  return {
    user,
    step,
    form,
    classes,
    classesLoading,
    classesError,
    submitting,
    uploading,
    submitted,
    error,
    fieldErrors,
    updateField,
    toggleListField,
    handleRadioClick,
    nextStep,
    previousStep,
    reviewEditing,
    reviewProcessing,
    startReviewEdit,
    saveReviewEdit,
    selectReviewFile,
    handleSubmit,
    resetForm,
  };
}
