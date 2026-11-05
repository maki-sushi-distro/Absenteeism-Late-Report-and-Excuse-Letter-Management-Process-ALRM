export function releaseEvidenceObjectUrl(url) {
  if (url) URL.revokeObjectURL(url);
}

export function createEvidenceObjectUrl(blob, previousUrl = "") {
  releaseEvidenceObjectUrl(previousUrl);
  return URL.createObjectURL(blob);
}
