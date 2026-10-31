export function normalizeRequestStatus(value) {
  const status = String(value || "").toLowerCase();
  return status === "noted" ? "approved" : status;
}

export function requestStatusLabel(value) {
  const status = normalizeRequestStatus(value);
  return status ? `${status.charAt(0).toUpperCase()}${status.slice(1)}` : "—";
}

export function normalizeRequestStatusText(value) {
  return String(value || "").replace(/\bnoted\b/gi, (word) => word[0] === word[0].toUpperCase() ? "Approved" : "approved");
}
