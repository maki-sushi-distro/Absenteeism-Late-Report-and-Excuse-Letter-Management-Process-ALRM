import { apiFetch, ApiError } from "./client.js";

export async function getCollection(path, { signal, perPage = 100 } = {}) {
  const [pathname, search = ""] = path.split("?");
  const query = new URLSearchParams(search);
  const records = [];
  let lastPage = 1;
  for (let page = 1; page <= lastPage; page++) {
    query.set("page", String(page));
    query.set("per_page", String(perPage));
    const endpoint = pathname.startsWith("/api/") ? pathname : `/api${pathname}`;
    const response = await apiFetch(`${endpoint}?${query}`, { signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.success === false) throw new ApiError(payload?.message || "Could not load records.", response.status, payload?.errors);
    if (!Array.isArray(payload?.data)) throw new Error("The server returned an unexpected collection.");
    if (payload.meta != null) {
      if (payload.meta.page !== page || !Number.isInteger(payload.meta.last_page) || payload.meta.last_page < page || payload.meta.last_page > 1000) throw new Error("The server returned unsupported pagination. Please narrow the records requested.");
      lastPage = payload.meta.last_page;
    }
    records.push(...payload.data);
  }
  return records;
}
