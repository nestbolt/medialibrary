import { describe, it, expect } from "vitest";
import { DefaultPathGenerator } from "../src/generators/default-path-generator";
import { MediaEntity } from "../src/entities/media.entity";

describe("DefaultPathGenerator", () => {
  const generator = new DefaultPathGenerator();

  function createMedia(id: string): MediaEntity {
    const media = new MediaEntity();
    media.id = id;
    media.fileName = "photo.jpg";
    return media;
  }

  it("should generate path for original file", () => {
    const media = createMedia("abc-123");
    expect(generator.getPath(media)).toBe("abc-123/");
  });

  it("should generate path for conversions", () => {
    const media = createMedia("abc-123");
    expect(generator.getPathForConversions(media)).toBe("abc-123/conversions/");
  });

  it("should generate path for responsive images", () => {
    const media = createMedia("abc-123");
    expect(generator.getPathForResponsiveImages(media)).toBe("abc-123/responsive-images/");
  });
});
