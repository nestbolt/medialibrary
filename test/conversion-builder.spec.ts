import { describe, it, expect } from "vitest";
import { ConversionBuilder } from "../src/conversion-builder";

describe("ConversionBuilder", () => {
  it("should build a basic conversion", () => {
    const config = new ConversionBuilder("thumbnail").build();

    expect(config.name).toBe("thumbnail");
    expect(config.performOnCollections).toEqual([]);
    expect(config.queued).toBe(false);
    expect(config.keepOriginalImageFormat).toBe(false);
    expect(config.manipulations).toEqual([]);
  });

  it("should add resize manipulation", () => {
    const config = new ConversionBuilder("thumb")
      .resize(150, 150, { fit: "cover" })
      .build();

    expect(config.manipulations).toHaveLength(1);
    expect(config.manipulations[0].operation).toBe("resize");
    expect(config.manipulations[0].args).toEqual([150, 150, { fit: "cover" }]);
  });

  it("should add format and quality", () => {
    const config = new ConversionBuilder("webp")
      .format("webp")
      .quality(80)
      .build();

    expect(config.manipulations).toHaveLength(2);
    expect(config.manipulations[0].operation).toBe("toFormat");
    expect(config.manipulations[0].args[0]).toBe("webp");
    expect(config.manipulations[1].operation).toBe("__quality");
    expect(config.manipulations[1].args[0]).toBe(80);
  });

  it("should chain multiple manipulations", () => {
    const config = new ConversionBuilder("preview")
      .resize(800)
      .format("webp")
      .quality(85)
      .sharpen()
      .build();

    expect(config.manipulations).toHaveLength(4);
  });

  it("should scope to specific collections", () => {
    const config = new ConversionBuilder("thumb")
      .performOnCollections("images", "gallery")
      .build();

    expect(config.performOnCollections).toEqual(["images", "gallery"]);
  });

  it("should mark as queued", () => {
    const config = new ConversionBuilder("thumb").queued().build();
    expect(config.queued).toBe(true);
  });

  it("should keep original image format", () => {
    const config = new ConversionBuilder("thumb").keepOriginalImageFormat().build();
    expect(config.keepOriginalImageFormat).toBe(true);
  });

  it("should support crop", () => {
    const config = new ConversionBuilder("crop")
      .crop(200, 200, 10, 20)
      .build();

    expect(config.manipulations[0].operation).toBe("extract");
    expect(config.manipulations[0].args[0]).toEqual({
      width: 200,
      height: 200,
      left: 10,
      top: 20,
    });
  });

  it("should support blur, flip, flop, greyscale, rotate, negate, normalize", () => {
    const config = new ConversionBuilder("effects")
      .blur(5)
      .flip()
      .flop()
      .greyscale()
      .rotate(90)
      .negate()
      .normalize()
      .build();

    expect(config.manipulations).toHaveLength(7);
    expect(config.manipulations.map((m) => m.operation)).toEqual([
      "blur",
      "flip",
      "flop",
      "greyscale",
      "rotate",
      "negate",
      "normalise",
    ]);
  });

  it("should support custom sharp operations", () => {
    const config = new ConversionBuilder("custom")
      .withSharpOperation("gamma", 2.2)
      .build();

    expect(config.manipulations[0]).toEqual({
      operation: "gamma",
      args: [2.2],
    });
  });
});
