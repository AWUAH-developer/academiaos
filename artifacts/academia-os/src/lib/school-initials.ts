const IGNORED_WORDS = new Set(['and', 'of', 'the', '&']);

export function schoolInitials(name: string, maximum = 3) {
  const words = String(name || '')
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);

  const meaningful = words.filter((word) => !IGNORED_WORDS.has(word.toLowerCase()));
  const source = meaningful.length ? meaningful : words;

  if (!source.length) return 'SCH';
  if (source.length === 1) return source[0].slice(0, maximum).toUpperCase();
  return source.slice(0, maximum).map((word) => word[0]).join('').toUpperCase();
}
