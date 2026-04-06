import { describe, it, expect } from "vitest";
import { FileDoesNotExistException } from "../src/exceptions/file-does-not-exist.exception";
import { FileIsTooBigException } from "../src/exceptions/file-is-too-big.exception";
import { FileUnacceptableException } from "../src/exceptions/file-unacceptable.exception";
import { InvalidConversionException } from "../src/exceptions/invalid-conversion.exception";
import { DiskNotConfiguredException } from "../src/exceptions/disk-not-configured.exception";

describe("Exceptions", () => {
  describe("FileDoesNotExistException", () => {
    it("should include path in message", () => {
      const ex = new FileDoesNotExistException("/tmp/missing.jpg");
      expect(ex.message).toContain("/tmp/missing.jpg");
      expect(ex.name).toBe("FileDoesNotExistException");
    });
  });

  describe("FileIsTooBigException", () => {
    it("should show file and max size in MB", () => {
      const ex = new FileIsTooBigException(20 * 1024 * 1024, 10 * 1024 * 1024);
      expect(ex.message).toContain("20.00 MB");
      expect(ex.message).toContain("10.00 MB");
      expect(ex.name).toBe("FileIsTooBigException");
    });
  });

  describe("FileUnacceptableException", () => {
    it("should include file and collection in message", () => {
      const ex = new FileUnacceptableException("file.exe", "images");
      expect(ex.message).toContain("file.exe");
      expect(ex.message).toContain("images");
      expect(ex.name).toBe("FileUnacceptableException");
    });

    it("should include reason when provided", () => {
      const ex = new FileUnacceptableException("file.exe", "images", "bad mime type");
      expect(ex.message).toContain("bad mime type");
    });
  });

  describe("InvalidConversionException", () => {
    it("should include conversion name", () => {
      const ex = new InvalidConversionException("nonexistent");
      expect(ex.message).toContain("nonexistent");
      expect(ex.name).toBe("InvalidConversionException");
    });
  });

  describe("DiskNotConfiguredException", () => {
    it("should include disk name and available disks", () => {
      const ex = new DiskNotConfiguredException("cloud", ["local", "s3"]);
      expect(ex.message).toContain("cloud");
      expect(ex.message).toContain("local, s3");
      expect(ex.name).toBe("DiskNotConfiguredException");
    });

    it("should show (none) when no disks available", () => {
      const ex = new DiskNotConfiguredException("any", []);
      expect(ex.message).toContain("(none)");
    });
  });
});
