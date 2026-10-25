// src/api/client.js
const backendUrl = (import.meta.env?.VITE_API_URL || "").replace(/\/api\/?$/, "").replace(/\/$/, "");
export const API_URL = backendUrl;
const TOKEN_CHANGED_EVENT = "alrm:token-changed";

export function getToken() {
  return localStorage.getItem("auth_token");
}

export function setToken(token) {
  if (getToken() === (token || null)) return;

  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

export function subscribeToTokenChanges(onChange) {
  function handleStorage(event) {
    if (event.key === "auth_token" || event.key === null) onChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(TOKEN_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(TOKEN_CHANGED_EVENT, onChange);
  };
}

export function clearToken() {
  setToken(null);
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: options.credentials || "include",
    headers,
  });

  if (res.status === 401 && token && getToken() === token && headers.get("Authorization") === `Bearer ${token}`) {
    setToken(null);
  }

  return res;
}

export class ApiError extends Error {
  constructor(message, status, errors = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function buildQuery(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });

  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function apiRequest(path, options = {}) {
  const res = await apiFetch(path.startsWith("/api/") ? path : `/api${path}`, options);
  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await res.json()
    : null;

  if (!res.ok) {
    throw new ApiError(
      payload?.message || "The server could not complete this request.",
      res.status,
      payload?.errors || null,
    );
  }

  return payload?.data ?? payload;
}

export async function apiDownload(path, filename = "alrm-report.xlsx") {
  const res = await apiFetch(path.startsWith("/api/") ? path : `/api${path}`);

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new ApiError(
      payload?.message || "The report could not be downloaded.",
      res.status,
      payload?.errors || null,
    );
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function googleLoginUrl(options = {}) {
  // The OAuth cookie must be set on the same host that receives Google's callback.
  const url = new URL("/api/auth/google/redirect", window.location.origin);
  url.searchParams.set("origin", window.location.origin);
  if (options.prompt) url.searchParams.set("prompt", options.prompt);
  return url.toString();
}
