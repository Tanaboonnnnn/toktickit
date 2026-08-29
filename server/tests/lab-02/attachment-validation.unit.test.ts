import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  validateAttachment,
} from "../../src/attachment-contract.js";

const signatures = {
  jpg: Buffer.from([0xff, 0xd8, 0xff, 0x00]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  webp: Buffer.from("RIFFxxxxWEBP"),
  pdf: Buffer.from("%PDF-1.7"),
};

describe("attachment validation", () => {
  it.each([
    ["photo.JPG", "image/jpeg", signatures.jpg],
    ["photo.jpeg", "image/jpeg", signatures.jpg],
    ["image.PNG", "image/png", signatures.png],
    ["image.webp", "image/webp", signatures.webp],
    ["document.pdf", "application/pdf", signatures.pdf],
  ])("accepts permitted %s", (name, mimeType, bytes) => {
    expect(validateAttachment(name, mimeType, bytes.length, bytes)).toEqual({
      extension: name.slice(name.lastIndexOf(".")).toLowerCase(),
      mimeType,
    });
  });

  it("rejects extension and MIME mismatch", () => {
    expect(() => validateAttachment("photo.png", "image/jpeg", signatures.jpg.length, signatures.jpg))
      .toThrow("must match");
  });

  it("rejects a permitted-looking file with the wrong signature", () => {
    expect(() => validateAttachment("photo.jpg", "image/jpeg", 3, Buffer.from("not-a-jpeg")))
      .toThrow("signature");
  });

  it("rejects unsupported extension/type and empty data", () => {
    expect(() => validateAttachment("archive.zip", "application/zip", 4, Buffer.from("PK\x03\x04")))
      .toThrow("Unsupported");
    expect(() => validateAttachment("empty.pdf", "application/pdf", 0, Buffer.alloc(0)))
      .toThrow("empty");
  });

  it("accepts exact inclusive boundary and rejects above it", () => {
    const bytes = Buffer.concat([signatures.pdf, Buffer.alloc(MAX_ATTACHMENT_BYTES - signatures.pdf.length)]);
    expect(validateAttachment("large.pdf", "application/pdf", MAX_ATTACHMENT_BYTES, bytes)).toBeTruthy();
    expect(() => validateAttachment("too-large.pdf", "application/pdf", MAX_ATTACHMENT_BYTES + 1, Buffer.concat([bytes, Buffer.from("x")]))).toThrow("5 MiB");
  });
});
