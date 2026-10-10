// src/api/client.js

const rawApiUrl = import.meta.env?.VITE_API_URL ?? "";

// Same-origin via proxy ang gusto natin. Tanggalin ang trailing "/api"
// at "/" dahil kasama na ang /api sa mga path sa code.
export const API_URL = rawApiUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");

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

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: options.credentials || "include",
    headers,
  });

  if (
    res.status === 401 &&
    token &&
    getToken() === token &&
    headers.get("Authorization") === `Bearer ${token}`
  ) {
    // A delayed response from an old session must not clear a newer login.
    setToken(null);
  }

  return res;
}

export function googleLoginUrl(options = {}) {
  // Gamitin lang ang API_URL kung absolute (http/https).
  // Kung hindi, same-origin (window.location.origin).
  const base = /^https?:\/\//.test(API_URL) ? API_URL : window.location.origin;
  const url = new URL("/api/auth/google/redirect", base);

  url.searchParams.set("origin", window.location.origin);

  if (options.prompt) {
    url.searchParams.set("prompt", options.prompt);
  }

  return url.toString();
}
