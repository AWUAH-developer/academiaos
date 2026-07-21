import { describe, expect, it } from 'vitest';
import { imageToDataUrl, ImageUploadError } from '../src/lib/images';
import { cleanIdentifier, cleanText, isValidEmail, isValidPhone } from '../src/lib/validation';

describe('security validation', () => {
  it('removes control characters and limits text length', () => {
    expect(cleanText('  Ama\u0000 Mensah  ', 20)).toBe('Ama Mensah');
    expect(cleanText('123456789', 5)).toBe('12345');
  });

  it('accepts normal Ghanaian contact formats and rejects scripts', () => {
    expect(isValidPhone('+233 24 123 4567')).toBe(true);
    expect(isValidPhone('<script>alert(1)</script>')).toBe(false);
    expect(isValidEmail('parent@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('normalizes school and admission codes', () => {
    expect(cleanIdentifier(' pla/2026/001 ', 20)).toBe('PLA/2026/001');
  });

  it('rejects a fake image whose bytes do not match its declared type', async () => {
    const fakeImage = new File([Buffer.from('<script>alert(1)</script>')], 'photo.png', { type: 'image/png' });
    await expect(imageToDataUrl(fakeImage, { required: true })).rejects.toBeInstanceOf(ImageUploadError);
  });

  it('accepts a valid PNG signature', async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const image = new File([bytes], 'photo.png', { type: 'image/png' });
    const result = await imageToDataUrl(image, { required: true });
    expect(result).toMatch(/^data:image\/png;base64,/);
  });
});
