// src/api/client.js
const backendUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const API_URL = backendUrl.endsWith("/api")
  ? backendUrl
  : `${backendUrl}/api`;

export function getToken() {
  return localStorage.getItem("auth_token");
}

export function setToken(token) {
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
}

export function clearToken() {
  setToken(null);
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // token is invalid/expired — clear it so the app falls back to login
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
  const res = await apiFetch(path, options);
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
  const res = await apiFetch(path);

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

export function googleLoginUrl() {
  return `${API_URL}/auth/google/redirect`;
}
