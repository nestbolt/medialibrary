import { describe, it, expect, beforeEach } from "vitest";
import { MediaEntity } from "../src/entities/media.entity";

describe("MediaEntity", () => {
  let media: MediaEntity;

  beforeEach(() => {
    media = new MediaEntity();
    media.id = "test-uuid";
    media.modelType = "Post";
    media.modelId = "1";
    media.uuid = "some-uuid";
    media.collectionName = "images";
    media.name = "photo";
    media.fileName = "photo.jpg";
    media.mimeType = "image/jpeg";
    media.disk = "local";
    media.conversionsDisk = null;
    media.size = 1024 * 1024;
    media.manipulations = {};
    media.customProperties = {};
    media.generatedConversions = {};
    media.responsiveImages = {};
    media.orderColumn = null;
    media.createdAt = new Date();
    media.updatedAt = new Date();
  });

  describe("custom properties", () => {
    it("should set and get custom properties", () => {
      media.setCustomProperty("alt", "A beautiful photo");
      expect(media.hasCustomProperty("alt")).toBe(true);
      expect(media.getCustomProperty("alt")).toBe("A beautiful photo");
    });

    it("should return fallback for missing properties", () => {
      expect(media.getCustomProperty("missing", "default")).toBe("default");
      expect(media.getCustomProperty("missing")).toBeUndefined();
    });

    it("should handle nested properties with dot notation", () => {
      media.setCustomProperty("meta.author", "John");
      media.setCustomProperty("meta.tags", ["nature", "photo"]);

      expect(media.hasCustomProperty("meta.author")).toBe(true);
      expect(media.getCustomProperty("meta.author")).toBe("John");
      expect(media.getCustomProperty("meta.tags")).toEqual(["nature", "photo"]);
    });

    it("should forget custom properties", () => {
      media.setCustomProperty("key", "value");
      expect(media.hasCustomProperty("key")).toBe(true);

      media.forgetCustomProperty("key");
      expect(media.hasCustomProperty("key")).toBe(false);
    });

    it("should chain setCustomProperty calls", () => {
      const result = media
        .setCustomProperty("a", 1)
        .setCustomProperty("b", 2);

      expect(result).toBe(media);
      expect(media.getCustomProperty("a")).toBe(1);
      expect(media.getCustomProperty("b")).toBe(2);
    });
  });

  describe("generated conversions", () => {
    it("should mark conversion as generated", () => {
      expect(media.hasGeneratedConversion("thumbnail")).toBe(false);

      media.markConversionAsGenerated("thumbnail");
      expect(media.hasGeneratedConversion("thumbnail")).toBe(true);
    });

    it("should mark conversion as not generated", () => {
      media.markConversionAsGenerated("thumbnail");
      media.markConversionAsNotGenerated("thumbnail");
      expect(media.hasGeneratedConversion("thumbnail")).toBe(false);
    });
  });

  describe("bigint size transformer", () => {
    it("should handle size as number", () => {
      media.size = 1024;
      expect(media.size).toBe(1024);
      expect(typeof media.size).toBe("number");
    });

    it("should produce correct humanReadableSize when size is set as number", () => {
      media.size = 2048;
      expect(media.humanReadableSize).toBe("2.00 KB");
    });

    it("should handle size column transformer (string to number)", () => {
      // Simulate what TypeORM does when reading bigint from DB as string
      const columns = require("typeorm").getMetadataArgsStorage().columns;
      const sizeColumn = columns.find(
        (c: any) => c.target === MediaEntity && c.propertyName === "size",
      );
      expect(sizeColumn).toBeDefined();
      expect(sizeColumn.options.transformer).toBeDefined();

      const { from, to } = sizeColumn.options.transformer;
      // from: converts DB value (string) → JS value (number)
      expect(from("12345")).toBe(12345);
      expect(from(12345)).toBe(12345);
      // to: passes through number for writing to DB
      expect(to(12345)).toBe(12345);
    });
  });

  describe("computed properties", () => {
    it("should return human readable size", () => {
      media.size = 1024 * 1024;
      expect(media.humanReadableSize).toBe("1.00 MB");
    });

    it("should return extension", () => {
      expect(media.extension).toBe("jpg");
    });

    it("should return type based on mime type", () => {
      expect(media.type).toBe("image");

      media.mimeType = "application/pdf";
      expect(media.type).toBe("pdf");

      media.mimeType = "video/mp4";
      expect(media.type).toBe("video");
    });
  });
});
