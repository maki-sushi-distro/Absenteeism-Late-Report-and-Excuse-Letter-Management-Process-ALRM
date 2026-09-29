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
  const response = await apiFetch("/api/complete-profile/programs");
  const body = await expectJson(response);
  const programs = listFrom(body);

  if (programs.length === 0) {
    throw new Error("The backend program list is empty.");
  }

  return programs;
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
