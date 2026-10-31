export function reportDatesComplete(filters) {
  return Boolean(filters.date_from && filters.date_to);
}
