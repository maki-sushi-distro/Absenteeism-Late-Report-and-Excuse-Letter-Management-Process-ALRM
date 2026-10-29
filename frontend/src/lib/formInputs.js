import { assertValidInputs, emailPattern, isIdentifier, isValidDate, personNamePattern, sanitizeText, textError } from './inputValidation.js';

const yearLevels = ['1st', '2nd', '3rd', '4th'];

export function prepareAccountInput(data) {
  const payload = { name: sanitizeText(data.name), email: sanitizeText(data.email).toLowerCase(), role: data.role };
  assertValidInputs({
    name: textError(payload.name, 'Full name', { min: 2, pattern: personNamePattern }),
    email: textError(payload.email, 'Email address', { pattern: emailPattern }),
    role: ['student', 'instructor', 'program_head', 'administrator'].includes(data.role) ? '' : 'Select an available role.',
  });
  return payload;
}

export function prepareProfileInput(data) {
  const payload = { program_id: sanitizeText(data.program_id) };
  const errors = { program_id: isIdentifier(payload.program_id) ? '' : 'Select a valid program.' };
  if (Object.hasOwn(data, 'school_student_id')) {
    payload.school_student_id = sanitizeText(data.school_student_id);
    errors.school_student_id = textError(payload.school_student_id, 'Student ID', { pattern: /^[\p{L}\p{N}][\p{L}\p{N} ._/-]*$/u });
  }
  if (Object.hasOwn(data, 'year_level')) {
    payload.year_level = data.year_level;
    errors.year_level = yearLevels.includes(data.year_level) ? '' : 'Select an available year level.';
  }
  // A profile form cannot assign its own role or account status.
  if (Object.hasOwn(data, 'role') || Object.hasOwn(data, 'status')) errors.role = 'Account role and status cannot be changed here.';
  assertValidInputs(errors);
  return payload;
}

export function prepareProgramInput(data, partial = false) {
  const payload = {};
  const errors = {};
  if (!partial || Object.hasOwn(data, 'program_name')) {
    payload.program_name = sanitizeText(data.program_name);
    errors.program_name = textError(payload.program_name, 'Program name');
  }
  if (Object.hasOwn(data, 'program_head_id')) {
    payload.program_head_id = data.program_head_id ? sanitizeText(data.program_head_id) : null;
    errors.program_head_id = payload.program_head_id === null || isIdentifier(payload.program_head_id) ? '' : 'Select a valid program head.';
  }
  assertValidInputs(errors);
  return payload;
}

export function prepareClassInput(data, partial = false) {
  const payload = {};
  const errors = {};
  for (const [key, label] of [['subject_name', 'Subject'], ['section', 'Section'], ['schedule', 'Schedule']]) {
    if (partial && !Object.hasOwn(data, key)) continue;
    payload[key] = sanitizeText(data[key]);
    errors[key] = textError(payload[key], label);
  }
  for (const [key, label] of [['instructor_id', 'instructor'], ['program_id', 'program']]) {
    if (partial && !Object.hasOwn(data, key)) continue;
    payload[key] = sanitizeText(data[key]);
    errors[key] = isIdentifier(payload[key]) ? '' : `Select a valid ${label}.`;
  }
  for (const [key, choices] of [['semester', ['1st', '2nd']], ['year_level', yearLevels]]) {
    if (partial && !Object.hasOwn(data, key)) continue;
    payload[key] = data[key];
    errors[key] = choices.includes(data[key]) ? '' : `Select an available ${key === 'semester' ? 'semester' : 'year level'}.`;
  }
  if (!partial || Object.hasOwn(data, 'school_year')) {
    payload.school_year = sanitizeText(data.school_year);
    const match = /^(\d{4})-(\d{4})$/.exec(payload.school_year);
    errors.school_year = match && Number(match[2]) === Number(match[1]) + 1 ? '' : 'Enter consecutive school years, for example 2026-2027.';
  }
  assertValidInputs(errors);
  return payload;
}

export function prepareReportFilters(filters) {
  const payload = { ...filters };
  const errors = {};
  for (const key of ['program_id', 'status', 'date_from', 'date_to']) {
    if (Object.hasOwn(payload, key)) payload[key] = sanitizeText(payload[key]);
  }
  if (payload.program_id && !isIdentifier(payload.program_id)) errors.program_id = 'Select a valid program.';
  if (payload.status && !['pending', 'approved', 'noted', 'invalid'].includes(payload.status)) errors.status = 'Select an available request status.';
  for (const [key, label] of [['date_from', 'start'], ['date_to', 'end']]) {
    if (payload[key] && !isValidDate(payload[key])) errors[key] = `Choose a valid ${label} date.`;
  }
  if (payload.date_from && payload.date_to && payload.date_from > payload.date_to) errors.date_to = 'The end date must be on or after the start date.';
  assertValidInputs(errors);
  return payload;
}
