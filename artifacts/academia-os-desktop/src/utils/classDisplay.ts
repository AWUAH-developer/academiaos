const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CUID_PATTERN = /^c[a-z0-9]{20,}$/i;

const LONG_IDENTIFIER_PATTERN =
  /^(?=.*[a-z])(?=.*[0-9])[a-z0-9_-]{24,}$/i;

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();

  if (
    !text ||
    ['null', 'undefined', 'none'].includes(text.toLowerCase())
  ) {
    return null;
  }

  return text;
}

function isOpaqueIdentifier(value: string): boolean {
  return (
    UUID_PATTERN.test(value) ||
    CUID_PATTERN.test(value) ||
    LONG_IDENTIFIER_PATTERN.test(value)
  );
}

export function formatClassDisplay(
  className: unknown,
  classStream?: unknown,
  classId?: unknown,
): string {
  const name = cleanText(className);
  const stream = cleanText(classStream);
  const id = cleanText(classId);

  if (
    !name ||
    isOpaqueIdentifier(name) ||
    (id && name.toLowerCase() === id.toLowerCase())
  ) {
    return 'Unassigned';
  }

  const safeStream =
    stream && !isOpaqueIdentifier(stream) ? stream : null;

  return [name, safeStream].filter(Boolean).join(' ');
}
