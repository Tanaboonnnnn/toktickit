import { ApiError, validationError } from "./errors.js";

export const MAX_ATTACHMENT_BYTES = 5_242_880;
export const MAX_ACTIVE_ATTACHMENTS = 5;
export const ALLOWED_ATTACHMENT_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
export type AttachmentMimeType = typeof ALLOWED_ATTACHMENT_MIME[number];

const rules: Record<AttachmentMimeType, { extensions: string[]; signature: (bytes: Buffer) => boolean }> = {
  "image/jpeg": { extensions: [".jpg", ".jpeg"], signature: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { extensions: [".png"], signature: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extensions: [".webp"], signature: (b) => b.length >= 12 && b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  "application/pdf": { extensions: [".pdf"], signature: (b) => b.subarray(0, 5).toString("ascii") === "%PDF-" },
};

export function validateAttachment(originalName: string, mimeType: string, sizeBytes: number, bytes: Buffer) {
  const extension = originalName.lastIndexOf(".") >= 0
    ? originalName.slice(originalName.lastIndexOf(".")).toLowerCase()
    : "";
  if (!Object.values(rules).some((rule) => rule.extensions.includes(extension))) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Unsupported attachment type. Allowed: JPG/JPEG, PNG, WEBP, PDF.");
  }
  const rule = rules[mimeType as AttachmentMimeType];
  if (!rule || !rule.extensions.includes(extension)) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Attachment extension and MIME type must match");
  }
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) throw new ApiError(400, "VALIDATION_ERROR", "Attachment must not be empty", { file: "Attachment must not be empty" });
  if (sizeBytes > MAX_ATTACHMENT_BYTES) throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Attachment must not exceed 5 MiB (5,242,880 bytes)");
  if (bytes.length !== sizeBytes || !rule.signature(bytes)) throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Attachment bytes do not match the declared file signature");
  return { extension, mimeType: mimeType as AttachmentMimeType };
}

export function countActiveAttachments(rows: ReadonlyArray<{ removedAt: Date | null }>): number {
  return rows.reduce((count, row) => count + (row.removedAt == null ? 1 : 0), 0);
}

export function assertAttachmentCapacity(activeCount: number): void {
  if (activeCount >= MAX_ACTIVE_ATTACHMENTS) throw new ApiError(409, "ATTACHMENT_LIMIT_REACHED", "A ticket may have at most five active attachments");
}

export function validateRemovalReason(reason: unknown): string {
  if (typeof reason !== "string") throw validationError({ removalReason: "Removal reason is required" });
  const trimmed = reason.trim();
  if (trimmed.length < 3 || trimmed.length > 200) throw validationError({ removalReason: "Removal reason must contain 3 to 200 characters" });
  return trimmed;
}

export function parsePositiveId(value: string, field: string): number {
  if (!/^[1-9]\d*$/.test(value)) throw validationError({ [field]: "ID must be a positive integer" });
  const id = Number(value);
  if (!Number.isSafeInteger(id)) throw validationError({ [field]: "ID must be a positive integer" });
  return id;
}
