import { apiFetch } from "./client.js";

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function validationMessage(errors) {
  if (!errors) return null;

  const firstField = Object.keys(errors)[0];
  const firstError = firstField ? errors[firstField]?.[0] : null;

  return firstError || null;
}

async function expectJson(res) {
  const body = await readJson(res);

  if (!res.ok) {
    const message =
      validationMessage(body?.errors) ||
      body?.message ||
      `Request failed with status ${res.status}.`;

    const error = new Error(message);
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body;
}

function listFrom(body) {
  const payload = body?.data ?? body;

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.programs)) return payload.programs;
  if (Array.isArray(payload?.items)) return payload.items;

  return [];
}

export async function getProfileSetupPrograms() {
  const endpoints = ["/api/programs", "/api/test/programs"];
  let lastError = null;

  for (const endpoint of endpoints) {
    const response = await apiFetch(endpoint);

    if (response.ok) {
      const programs = listFrom(await response.json());

      if (programs.length === 0) {
        throw new Error("The backend program list is empty.");
      }

      return programs;
    }

    try {
      await expectJson(response);
    } catch (error) {
      lastError = error;
    }

    if (![404, 405].includes(response.status)) break;
  }

  throw new Error(
    lastError?.status === 404
      ? "The backend does not expose a program-list endpoint for profile setup."
      : lastError?.message || "Unable to load programs from the backend.",
  );
}

export async function saveProfileSetup(payload) {
  const res = await apiFetch("/api/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  if ([404, 405].includes(res.status)) {
    return {
      savedToBackend: false,
      message:
        "The backend does not currently expose a self-profile update route.",
    };
  }

  const body = await expectJson(res);

  return {
    savedToBackend: true,
    body,
  };
}
