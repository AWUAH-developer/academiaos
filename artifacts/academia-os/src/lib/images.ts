const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 1_500_000;

export class ImageUploadError extends Error {}

function detectedImageType(bytes: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'image/png';
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'image/webp';
  return null;
}

export async function imageToDataUrl(
  value: FormDataEntryValue | null,
  options: { required?: boolean; label?: string } = {}
): Promise<string | null> {
  const label = options.label || 'Image';

  if (!(value instanceof File) || value.size === 0) {
    if (options.required) throw new ImageUploadError(`${label} is required`);
    return null;
  }

  if (!ALLOWED_IMAGE_TYPES.has(value.type)) {
    throw new ImageUploadError(`${label} must be a JPG, PNG or WebP image`);
  }

  if (value.size > MAX_IMAGE_BYTES) {
    throw new ImageUploadError(`${label} must be 1.5 MB or smaller`);
  }

  const bytes = Buffer.from(await value.arrayBuffer());
  const detectedType = detectedImageType(bytes);
  if (!detectedType || detectedType !== value.type) {
    throw new ImageUploadError(`${label} content does not match its file type`);
  }

  return `data:${detectedType};base64,${bytes.toString('base64')}`;
}
