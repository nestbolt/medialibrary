import { describe, it, expect } from "vitest";
import * as sharp from "sharp";
import { FileManipulator } from "../src/file-manipulator";
import type { ConversionConfig } from "../src/interfaces/conversion.interface";

describe("FileManipulator", () => {
  const manipulator = new FileManipulator();

  async function createTestImage(
    width: number = 100,
    height: number = 100,
  ): Promise<Buffer> {
    return sharp.default({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();
  }

  it("should check if mime type is an image", () => {
    expect(manipulator.isImage("image/jpeg")).toBe(true);
    expect(manipulator.isImage("image/png")).toBe(true);
    expect(manipulator.isImage("image/webp")).toBe(true);
    expect(manipulator.isImage("image/svg+xml")).toBe(false);
    expect(manipulator.isImage("application/pdf")).toBe(false);
    expect(manipulator.isImage("video/mp4")).toBe(false);
  });

  it("should perform resize conversion", async () => {
    const source = await createTestImage(200, 200);
    const conversion: ConversionConfig = {
      name: "thumb",
      performOnCollections: [],
      queued: false,
      keepOriginalImageFormat: false,
      manipulations: [{ operation: "resize", args: [50, 50, undefined] }],
    };

    const result = await manipulator.performConversion(source, conversion, "image/jpeg");
    const metadata = await sharp.default(result.buffer).metadata();

    expect(metadata.width).toBe(50);
    expect(metadata.height).toBe(50);
  });

  it("should convert format to webp", async () => {
    const source = await createTestImage();
    const conversion: ConversionConfig = {
      name: "webp",
      performOnCollections: [],
      queued: false,
      keepOriginalImageFormat: false,
      manipulations: [{ operation: "toFormat", args: ["webp", undefined] }],
    };

    const result = await manipulator.performConversion(source, conversion, "image/jpeg");
    expect(result.mimeType).toBe("image/webp");
    expect(result.extension).toBe("webp");
  });

  it("should apply quality setting", async () => {
    const source = await createTestImage();
    const highQuality: ConversionConfig = {
      name: "high",
      performOnCollections: [],
      queued: false,
      keepOriginalImageFormat: false,
      manipulations: [{ operation: "__quality", args: [100] }],
    };
    const lowQuality: ConversionConfig = {
      name: "low",
      performOnCollections: [],
      queued: false,
      keepOriginalImageFormat: false,
      manipulations: [{ operation: "__quality", args: [10] }],
    };

    const highResult = await manipulator.performConversion(source, highQuality, "image/jpeg");
    const lowResult = await manipulator.performConversion(source, lowQuality, "image/jpeg");

    expect(lowResult.buffer.length).toBeLessThan(highResult.buffer.length);
  });

  it("should apply greyscale", async () => {
    const source = await createTestImage();
    const conversion: ConversionConfig = {
      name: "grey",
      performOnCollections: [],
      queued: false,
      keepOriginalImageFormat: false,
      manipulations: [{ operation: "greyscale", args: [] }],
    };

    const result = await manipulator.performConversion(source, conversion, "image/jpeg");
    expect(result.buffer.length).toBeGreaterThan(0);
  });

  it("should chain multiple manipulations", async () => {
    const source = await createTestImage(400, 400);
    const conversion: ConversionConfig = {
      name: "complex",
      performOnCollections: [],
      queued: false,
      keepOriginalImageFormat: false,
      manipulations: [
        { operation: "resize", args: [200, 200, undefined] },
        { operation: "greyscale", args: [] },
        { operation: "toFormat", args: ["png", undefined] },
      ],
    };

    const result = await manipulator.performConversion(source, conversion, "image/jpeg");
    const metadata = await sharp.default(result.buffer).metadata();

    expect(metadata.width).toBe(200);
    expect(metadata.format).toBe("png");
    expect(result.mimeType).toBe("image/png");
  });
});
