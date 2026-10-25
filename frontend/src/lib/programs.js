export function programShortName(name) {
  const normalized = String(name || "").replace(/^Bachelor of Science\s+/i, "BS ")
    .replace(/^Bachelor of Arts\s+/i, "BA ").replace(/^Associate in\s+/i, "A ");
  const match = normalized.match(/^(BS|BA|A)\s+(?:in\s+)?(.+)$/i);
  if (!match) return normalized;
  const initials = match[2].split(/\s+/).filter(word => !["and", "in", "of"].includes(word.toLowerCase())).map(word => word[0]).join("");
  return `${match[1]}${initials}`.toUpperCase();
}
