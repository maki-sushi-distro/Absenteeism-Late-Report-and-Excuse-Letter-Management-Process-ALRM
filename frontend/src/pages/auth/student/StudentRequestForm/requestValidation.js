import { findClassByText, yearOptionsForProgram } from "./requestConfig.js";

export function validateRequestStep(form, currentStep, classes, classesError) {
  const errors = {};
  if (currentStep === 0 && !form.requestType) errors.requestType = "Select a request.";
  if (currentStep === 2 && form.consent !== "agree") errors.consent = "You must agree before continuing.";

  if (currentStep === 3) {
    if (!form.studentName.trim() || form.studentName.trim().length < 2) errors.studentName = "Enter a valid student name.";
    if (!form.program) errors.program = "Select your program.";
    if (!form.level) errors.level = "Select your level.";
    else if (!yearOptionsForProgram(form.program).includes(form.level)) errors.level = "Select an available level for your program.";
    if (!form.guardianName.trim() || form.guardianName.trim().length < 2) errors.guardianName = "Enter a valid parent or guardian's name.";
    else if (/\d/.test(form.guardianName.trim())) errors.guardianName = "Parent or guardian's name must not contain numbers.";
    if (!form.contactNumber.trim()) errors.contactNumber = "Enter your contact number.";
    else if (!/^(09\d{9}|\+639\d{9})$/.test(form.contactNumber.trim())) errors.contactNumber = "Enter a valid phone number starting with 09 or +639.";
    if (!form.dateSubmitted) errors.dateSubmitted = "Choose a date.";
  }

  if (currentStep === 4) {
    if (form.requestType === "late" && !form.minutesLate.trim()) errors.minutesLate = "Enter minutes late.";
    else if (form.requestType === "late" && (!/^\d+$/.test(form.minutesLate.trim()) || Number(form.minutesLate.trim()) <= 0)) errors.minutesLate = "Enter a valid number of minutes.";
    if (form.requestType === "absence" && !form.startDateOfAbsence) errors.startDateOfAbsence = "Choose the start date of absence.";
    if (form.requestType === "absence" && !form.endDateOfAbsence) errors.endDateOfAbsence = "Choose the end date of absence.";
    if (form.requestType === "absence" && form.startDateOfAbsence && form.endDateOfAbsence &&
      form.endDateOfAbsence < form.startDateOfAbsence) errors.endDateOfAbsence = "End date must be the same as or later than the start date.";
    if (form.requestType === "late" && !form.classId) errors.classId = "Select your class.";
    if (form.requestType === "absence" && !form.classText.trim()) errors.classText = "Enter your program subject/class.";
    if (form.requestType === "absence" && form.classText.trim() && classes.length === 0) errors.classText = classesError || "Your enrolled classes are unavailable.";
    if (form.requestType === "absence" && form.classText.trim() && classes.length > 0 &&
      !findClassByText(classes, form.classText)) errors.classText = "Enter a subject/class that matches one of your enrolled classes.";
    if (form.requestType === "late" && !form.reason.trim()) errors.reason = "Enter your reason.";
    else if (form.requestType === "late" && form.reason.trim().length < 3) errors.reason = "Enter a valid reason.";
    if (form.requestType === "absence" && form.absenceReasons.length === 0) errors.absenceReasons = "Select at least one reason.";
  }

  if (currentStep === 6 && !form.declaration) errors.declaration = "Confirm the declaration before submitting.";
  return errors;
}

export function firstInvalidRequestStep(form, classes, classesError) {
  for (let step = 0; step <= 6; step += 1) {
    const errors = validateRequestStep(form, step, classes, classesError);
    if (Object.keys(errors).length > 0) return { step, errors };
  }
  return null;
}
