const MAX_HOMEWORK_MATERIAL_BYTES = 3_000_000;

const ALLOWED_HOMEWORK_MATERIAL_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export class HomeworkMaterialUploadError extends Error {}

function detectedHomeworkMaterialType(bytes: Buffer): string | null {
  if (
    bytes.length >= 5 &&
    bytes.subarray(0, 5).toString("ascii") === "%PDF-"
  ) return "application/pdf";

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) return "image/jpeg";

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) return "image/png";

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) return "image/webp";

  return null;
}

export async function homeworkMaterialToDataUrl(
  value: FormDataEntryValue | null
): Promise<{
  dataUrl: string;
  fileName: string;
  mimeType: string;
} | null> {
  if (!(value instanceof File) || value.size === 0) return null;

  if (!ALLOWED_HOMEWORK_MATERIAL_TYPES.has(value.type)) {
    throw new HomeworkMaterialUploadError(
      "Homework material must be a PDF, JPG, PNG or WebP file."
    );
  }

  if (value.size > MAX_HOMEWORK_MATERIAL_BYTES) {
    throw new HomeworkMaterialUploadError(
      "Homework material must be 3 MB or smaller."
    );
  }

  const bytes = Buffer.from(await value.arrayBuffer());
  const detectedType = detectedHomeworkMaterialType(bytes);

  if (!detectedType || detectedType !== value.type) {
    throw new HomeworkMaterialUploadError(
      "Homework material content does not match its file type."
    );
  }

  return {
    dataUrl: "data:" + detectedType + ";base64," + bytes.toString("base64"),
    fileName: value.name.trim().slice(0, 180) || "homework-material",
    mimeType: detectedType
  };
}
