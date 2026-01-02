const toStandardAcadSem = (year, semester) => `${year}_${semester}`;

const toNtuScheduleSem = (acadsem) => acadsem.replace('_', ';');

const toNtuContentSem = (acadsem) => acadsem; // Already matches standard (YYYY_S)

const parseAcadSem = (raw) => {
  // Handle 2025_2, 2025;2, 2025 2
  // Also handle special terms which might be chars
  let match = raw.match(/^(\d{4})[_;](\w)$/);
  if (match) return { year: match[1], semester: match[2] };
  
  match = raw.match(/^(\d{4})\s+(\w)$/);
  if (match) return { year: match[1], semester: match[2] };

  // Fallback for weird formats
  return { year: raw.substring(0, 4), semester: raw.substring(raw.length - 1) };
}

module.exports = {
  toStandardAcadSem,
  toNtuScheduleSem,
  toNtuContentSem,
  parseAcadSem,
};
