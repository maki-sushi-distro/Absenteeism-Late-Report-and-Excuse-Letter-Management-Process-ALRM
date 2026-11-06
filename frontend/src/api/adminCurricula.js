import { apiRequest, buildQuery } from "./client.js";
import { getCollection } from "./collections.js";

export function getCurricula(programId) {
  return getCollection(`/admin/curricula${buildQuery({ program_id: programId })}`);
}

export function getCurriculum(curriculumId) {
  return apiRequest(`/admin/curricula/${encodeURIComponent(curriculumId)}`);
}

export async function getApplicableCurriculum(programId, currentSubjectId = "") {
  const curricula = await getCurricula(programId);
  if (!curricula.length) throw new Error("No curriculum is available for this program.");
  if (curricula.length === 1) return getCurriculum(curricula[0].id);
  const details = await Promise.all(curricula.map(entry => getCurriculum(entry.id)));
  const match = currentSubjectId && details.find(entry => entry.subjects?.some(subject => String(subject.id) === String(currentSubjectId)));
  if (match) return match;
  throw new Error("Multiple curricula are available. The backend must identify the applicable curriculum.");
}
