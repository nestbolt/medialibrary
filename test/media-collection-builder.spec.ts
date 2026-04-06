import { describe, it, expect } from "vitest";
import { MediaCollectionBuilder } from "../src/media-collection-builder";

describe("MediaCollectionBuilder", () => {
  it("should build a basic collection", () => {
    const config = new MediaCollectionBuilder("images").build();

    expect(config.name).toBe("images");
    expect(config.diskName).toBeUndefined();
    expect(config.singleFile).toBe(false);
    expect(config.fallbackUrls).toEqual({});
    expect(config.fallbackPaths).toEqual({});
  });

  it("should set disk", () => {
    const config = new MediaCollectionBuilder("docs")
      .useDisk("s3")
      .build();

    expect(config.diskName).toBe("s3");
  });

  it("should set conversions disk", () => {
    const config = new MediaCollectionBuilder("images")
      .storeConversionsOnDisk("s3")
      .build();

    expect(config.conversionsDiskName).toBe("s3");
  });

  it("should accept specific mime types", () => {
    const config = new MediaCollectionBuilder("images")
      .acceptsMimeTypes(["image/jpeg", "image/png"])
      .build();

    expect(config.acceptsMimeTypes).toEqual(["image/jpeg", "image/png"]);
  });

  it("should set single file mode", () => {
    const config = new MediaCollectionBuilder("avatar")
      .singleFile()
      .build();

    expect(config.singleFile).toBe(true);
  });

  it("should set collection size limit", () => {
    const config = new MediaCollectionBuilder("gallery")
      .onlyKeepLatest(5)
      .build();

    expect(config.collectionSizeLimit).toBe(5);
  });

  it("should set max file size", () => {
    const config = new MediaCollectionBuilder("uploads")
      .maxFileSize(5 * 1024 * 1024)
      .build();

    expect(config.maxFileSize).toBe(5 * 1024 * 1024);
  });

  it("should set fallback URLs", () => {
    const config = new MediaCollectionBuilder("avatar")
      .useFallbackUrl("/defaults/avatar.png")
      .useFallbackUrl("/defaults/avatar-thumb.png", "thumbnail")
      .build();

    expect(config.fallbackUrls["*"]).toBe("/defaults/avatar.png");
    expect(config.fallbackUrls["thumbnail"]).toBe("/defaults/avatar-thumb.png");
  });

  it("should set custom file acceptance", () => {
    const predicate = (file: { mimeType: string; size: number; fileName: string }) =>
      file.size < 1024;

    const config = new MediaCollectionBuilder("small")
      .acceptsFile(predicate)
      .build();

    expect(config.acceptsFile).toBe(predicate);
  });

  it("should chain all methods fluently", () => {
    const builder = new MediaCollectionBuilder("test");
    const result = builder
      .useDisk("s3")
      .acceptsMimeTypes(["image/jpeg"])
      .singleFile()
      .maxFileSize(1024)
      .useFallbackUrl("/default.png");

    expect(result).toBe(builder);
  });
});
