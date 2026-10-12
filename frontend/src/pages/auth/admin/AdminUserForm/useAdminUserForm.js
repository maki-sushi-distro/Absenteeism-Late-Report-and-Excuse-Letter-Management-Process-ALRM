import { useEffect, useMemo, useState } from "react";
import { getAdminPrograms } from "@/api/adminUsers";

function formErrorFrom(error) {
  if (error?.status === 404 || error?.status === 405) {
    return "The backend does not currently expose an admin create-user endpoint. No instructor or student was created.";
  }
  return error?.message || "Something went wrong while saving this account.";
}

export function useAdminUserForm({ createUser, fields, initialValues, title, validate }) {
  const needsPrograms = fields.some((field) => field.type === "program");
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(needsPrograms);
  const [programError, setProgramError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!needsPrograms) return;
    let alive = true;
    async function loadPrograms() {
      try {
        const data = await getAdminPrograms();
        if (alive) setPrograms(data);
      } catch (error) {
        if (alive) setProgramError(error?.message || "Unable to load programs from the backend.");
      } finally {
        if (alive) setLoadingPrograms(false);
      }
    }
    loadPrograms();
    return () => { alive = false; };
  }, [needsPrograms]);

  const programOptions = useMemo(() => programs.map((program) => ({
    label: program.program_name || program.name || `Program ${program.id}`,
    value: String(program.id),
  })), [programs]);

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: "" }));
    setSuccess("");
    setSubmitError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setSuccess("");
    setSubmitError("");
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    try {
      const result = await createUser(values);
      setSuccess(result?.message || `${title} pre-registered. The account will be completed at first sign-in.`);
      setValues(initialValues);
      setErrors({});
    } catch (error) {
      setSubmitError(formErrorFrom(error));
    } finally {
      setSubmitting(false);
    }
  }

  return { values, errors, programOptions, loadingPrograms, programError,
    submitting, success, submitError, handleChange, handleSubmit };
}
