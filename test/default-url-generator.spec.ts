import { describe, it, expect } from "vitest";
import { DefaultUrlGenerator } from "../src/generators/default-url-generator";
import { DefaultPathGenerator } from "../src/generators/default-path-generator";
import { DiskManager } from "../src/storage/disk-manager";
import { MediaEntity } from "../src/entities/media.entity";

describe("DefaultUrlGenerator", () => {
  function createMedia(overrides: Partial<MediaEntity> = {}): MediaEntity {
    const media = new MediaEntity();
    media.id = "test-id";
    media.fileName = "photo.jpg";
    media.disk = "local";
    media.conversionsDisk = null;
    Object.assign(media, overrides);
    return media;
  }

  function createGenerator(options: Record<string, any> = {}): DefaultUrlGenerator {
    const opts = {
      disks: {
        local: { driver: "local" as const, root: "/tmp", urlBase: "/media" },
      },
      ...options,
    };
    const pathGen = new DefaultPathGenerator();
    const diskManager = new DiskManager(opts);
    return new DefaultUrlGenerator(opts, pathGen, diskManager);
  }

  it("should generate URL for original file", () => {
    const gen = createGenerator();
    const media = createMedia();
    const url = gen.getUrl(media);

    expect(url).toBe("/media/test-id/photo.jpg");
  });

  it("should generate URL for conversion", () => {
    const gen = createGenerator();
    const media = createMedia();
    const url = gen.getUrl(media, "thumbnail");

    expect(url).toBe("/media/test-id/conversions/thumbnail-photo.jpg");
  });

  it("should use baseUrl when configured", () => {
    const gen = createGenerator({ baseUrl: "https://cdn.example.com" });
    const media = createMedia();
    const url = gen.getUrl(media);

    expect(url).toBe("https://cdn.example.com/test-id/photo.jpg");
  });

  it("should include prefix in path", () => {
    const gen = createGenerator({ prefix: "uploads" });
    const media = createMedia();
    const path = gen.getPath(media);

    expect(path).toBe("uploads/test-id/photo.jpg");
  });

  it("should include prefix in conversion path", () => {
    const gen = createGenerator({ prefix: "uploads" });
    const media = createMedia();
    const path = gen.getPath(media, "thumb");

    expect(path).toBe("uploads/test-id/conversions/thumb-photo.jpg");
  });
});
