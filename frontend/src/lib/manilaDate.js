const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value) {
  if (!value) return null;
  const text = String(value);
  const date = new Date(DATE_ONLY.test(text) ? `${text}T00:00:00+08:00` : text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function manilaDateKey(value) {
  const date = parseDate(value);
  if (!date) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Manila",
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatManilaDate(value) {
  const date = parseDate(value);
  return date ? new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  }).format(date) : "Unavailable";
}

export function groupByManilaMonth(records, getDate) {
  const groups = new Map();
  for (const record of records) {
    const key = manilaDateKey(getDate(record)).slice(0, 7) || "unavailable";
    if (!groups.has(key)) {
      const label = key === "unavailable" ? "Date unavailable" : new Intl.DateTimeFormat("en-US", {
        month: "long", year: "numeric", timeZone: "Asia/Manila",
      }).format(new Date(`${key}-01T00:00:00+08:00`));
      groups.set(key, { key, label, records: [] });
    }
    groups.get(key).records.push(record);
  }
  return [...groups.values()].sort((a, b) => a.key === "unavailable" ? 1 : b.key === "unavailable" ? -1 : b.key.localeCompare(a.key));
}
