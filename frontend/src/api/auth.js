import { apiRequest, clearToken, googleLoginUrl } from "./client";

export function startGoogleLogin() {
  clearToken();
  window.location.assign(googleLoginUrl());
}

export function getCurrentUser() {
  return apiRequest("/me");
}

export async function logout() {
  try {
    await apiRequest("/logout", { method: "POST" });
  } finally {
    clearToken();
  }
}
