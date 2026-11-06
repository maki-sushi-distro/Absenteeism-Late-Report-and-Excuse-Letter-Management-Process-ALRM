function normalize(value) {
  return String(value ?? "").normalize("NFKC").trim().toLowerCase();
}

function goodSuffixTable(pattern) {
  const size = pattern.length;
  const shifts = Array(size + 1).fill(0);
  const borders = Array(size + 1).fill(0);
  let left = size;
  let right = size + 1;
  borders[left] = right;
  while (left > 0) {
    while (right <= size && pattern[left - 1] !== pattern[right - 1]) {
      if (shifts[right] === 0) shifts[right] = right - left;
      right = borders[right];
    }
    left -= 1;
    right -= 1;
    borders[left] = right;
  }
  right = borders[0];
  for (left = 0; left <= size; left += 1) {
    if (shifts[left] === 0) shifts[left] = right;
    if (left === right) right = borders[right];
  }
  return shifts;
}

export function compileBoyerMoore(query) {
  const pattern = normalize(query);
  const badCharacters = new Map([...pattern].map((character, index) => [character, index]));
  const goodSuffixes = goodSuffixTable(pattern);

  function matchesPrepared(text) {
    if (!pattern) return true;
    if (pattern.length > text.length) return false;
    let offset = 0;
    while (offset <= text.length - pattern.length) {
      let index = pattern.length - 1;
      while (index >= 0 && pattern[index] === text[offset + index]) index -= 1;
      if (index < 0) return true;
      const badShift = index - (badCharacters.get(text[offset + index]) ?? -1);
      offset += Math.max(1, badShift, goodSuffixes[index + 1]);
    }
    return false;
  }

  return {
    pattern,
    matches: value => matchesPrepared(normalize(value)),
    matchesPrepared,
  };
}

export function prepareAssignmentSearchText(record) {
  return normalize([
    record.displayInstructor,
    record.subject_name,
    record.displayProgram,
    record.section,
  ].filter(Boolean).join(" "));
}
