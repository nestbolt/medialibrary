import { describe, it, expect } from "vitest";
import {
  generateUuid,
  detectMimeType,
  getExtension,
  getExtensionFromMime,
  sanitizeFileName,
  getBaseName,
  formatBytes,
  getFileType,
} from "../src/helpers";

describe("file helpers", () => {
  describe("generateUuid", () => {
    it("should generate a valid UUID", () => {
      const uuid = generateUuid();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it("should generate unique UUIDs", () => {
      const a = generateUuid();
      const b = generateUuid();
      expect(a).not.toBe(b);
    });
  });

  describe("detectMimeType", () => {
    it("should detect common mime types", () => {
      expect(detectMimeType("photo.jpg")).toBe("image/jpeg");
      expect(detectMimeType("image.png")).toBe("image/png");
      expect(detectMimeType("doc.pdf")).toBe("application/pdf");
      expect(detectMimeType("style.css")).toBe("text/css");
    });

    it("should fallback for unknown extensions", () => {
      expect(detectMimeType("file.xyz123")).toBe("application/octet-stream");
    });
  });

  describe("getExtension", () => {
    it("should return extension", () => {
      expect(getExtension("photo.jpg")).toBe("jpg");
      expect(getExtension("archive.tar.gz")).toBe("gz");
    });

    it("should return empty string for no extension", () => {
      expect(getExtension("README")).toBe("");
    });
  });

  describe("getExtensionFromMime", () => {
    it("should return extension from mime type", () => {
      expect(getExtensionFromMime("image/jpeg")).toBe("jpeg");
      expect(getExtensionFromMime("image/png")).toBe("png");
    });

    it("should return empty string for unknown mime", () => {
      expect(getExtensionFromMime("application/x-unknown-type")).toBe("");
    });
  });

  describe("sanitizeFileName", () => {
    it("should sanitize special characters", () => {
      expect(sanitizeFileName("my file (1).jpg")).toBe("my-file-1.jpg");
    });

    it("should lowercase", () => {
      expect(sanitizeFileName("Photo.JPG")).toBe("photo.jpg");
    });

    it("should replace multiple spaces", () => {
      expect(sanitizeFileName("a   b")).toBe("a-b");
    });
  });

  describe("getBaseName", () => {
    it("should return base name without extension", () => {
      expect(getBaseName("photo.jpg")).toBe("photo");
      expect(getBaseName("my.file.name.png")).toBe("my.file.name");
    });

    it("should return full name when no extension", () => {
      expect(getBaseName("README")).toBe("README");
    });
  });

  describe("formatBytes", () => {
    it("should format zero bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("should format bytes", () => {
      expect(formatBytes(500)).toBe("500 B");
    });

    it("should format kilobytes", () => {
      expect(formatBytes(1024)).toBe("1.00 KB");
    });

    it("should format megabytes", () => {
      expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
    });

    it("should format gigabytes", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
    });
  });

  describe("getFileType", () => {
    it("should return image for image/* mime types", () => {
      expect(getFileType("image/jpeg")).toBe("image");
      expect(getFileType("image/png")).toBe("image");
    });

    it("should return video for video/* mime types", () => {
      expect(getFileType("video/mp4")).toBe("video");
    });

    it("should return audio for audio/* mime types", () => {
      expect(getFileType("audio/mpeg")).toBe("audio");
    });

    it("should return pdf for application/pdf", () => {
      expect(getFileType("application/pdf")).toBe("pdf");
    });

    it("should return document for text/* mime types", () => {
      expect(getFileType("text/plain")).toBe("document");
    });

    it("should return spreadsheet for spreadsheet mime types", () => {
      expect(getFileType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("spreadsheet");
      expect(getFileType("application/vnd.ms-excel")).toBe("spreadsheet");
    });

    it("should return presentation for presentation mime types", () => {
      expect(getFileType("application/vnd.ms-powerpoint")).toBe("presentation");
      expect(getFileType("application/vnd.openxmlformats-officedocument.presentationml.presentation")).toBe("presentation");
    });

    it("should return document for word processor mime types", () => {
      expect(getFileType("application/msword")).toBe("document");
      expect(getFileType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("document");
      expect(getFileType("application/rtf")).toBe("document");
    });

    it("should return archive for archive mime types", () => {
      expect(getFileType("application/zip")).toBe("archive");
      expect(getFileType("application/x-tar")).toBe("archive");
      expect(getFileType("application/gzip")).toBe("archive");
    });

    it("should return other for empty/unknown mime types", () => {
      expect(getFileType("")).toBe("other");
      expect(getFileType("application/octet-stream")).toBe("other");
    });
  });
});
