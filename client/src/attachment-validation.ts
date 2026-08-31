export const MAX_ATTACHMENT_BYTES = 5_242_880;
export const MAX_ACTIVE_ATTACHMENTS = 5;
export const ATTACHMENT_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";

const MIME_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "application/pdf": [".pdf"],
};

export function validateLocalAttachment(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  const expected = Object.entries(MIME_EXTENSIONS).find(([, extensions]) => extensions.includes(extension));
  if (!expected) return "Unsupported file type. Allowed: JPG/JPEG, PNG, WEBP, PDF.";
  if (file.type !== expected[0]) return `File type must be ${expected[0]} for ${extension} files.`;
  if (file.size <= 0) return "File must not be empty.";
  if (file.size > MAX_ATTACHMENT_BYTES) return "File must not exceed 5 MB (5,242,880 bytes).";
  return null;
}

export function formatAttachmentSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
