import { describe, it, expect, beforeEach } from "vitest";
import "reflect-metadata";
import { HasMedia } from "../src/decorators/has-media.decorator";
import {
  RegisterMediaCollections,
  RegisterMediaConversions,
} from "../src/decorators/media-registration.decorator";
import {
  MEDIA_COLLECTIONS_METADATA_KEY,
  MEDIA_CONVERSIONS_METADATA_KEY,
} from "../src/media.constants";

describe("RegisterMediaCollections", () => {
  beforeEach(() => {
    (globalThis as any).__nestbolt_media_collections = undefined;
  });

  it("should store collection factory as metadata", () => {
    @HasMedia({ modelType: "Post" })
    @RegisterMediaCollections((addCollection) => {
      addCollection("images").acceptsMimeTypes(["image/jpeg"]).singleFile();
      addCollection("documents");
    })
    class Post {}

    const factory = Reflect.getMetadata(MEDIA_COLLECTIONS_METADATA_KEY, Post);
    expect(factory).toBeDefined();

    const configs = factory();
    expect(configs).toHaveLength(2);
    expect(configs[0].name).toBe("images");
    expect(configs[0].acceptsMimeTypes).toEqual(["image/jpeg"]);
    expect(configs[0].singleFile).toBe(true);
    expect(configs[1].name).toBe("documents");
  });

  it("should register in globalThis registry", () => {
    @HasMedia({ modelType: "Article" })
    @RegisterMediaCollections((addCollection) => {
      addCollection("media");
    })
    class Article {}

    const registry = (globalThis as any).__nestbolt_media_collections;
    expect(registry).toBeDefined();
    expect(registry.has("Article")).toBe(true);

    const configs = registry.get("Article")();
    expect(configs).toHaveLength(1);
    expect(configs[0].name).toBe("media");
  });

  it("should use class name as modelType when @HasMedia not applied", () => {
    @RegisterMediaCollections((addCollection) => {
      addCollection("files");
    })
    class NoHasMediaClass {}

    const registry = (globalThis as any).__nestbolt_media_collections;
    expect(registry.has("NoHasMediaClass")).toBe(true);
  });

  it("should create globalThis map on first call", () => {
    (globalThis as any).__nestbolt_media_collections = undefined;

    @RegisterMediaCollections((addCollection) => {
      addCollection("test");
    })
    class First {}

    expect((globalThis as any).__nestbolt_media_collections).toBeInstanceOf(Map);
  });
});

describe("RegisterMediaConversions", () => {
  beforeEach(() => {
    (globalThis as any).__nestbolt_media_conversions = undefined;
  });

  it("should store conversion factory as metadata", () => {
    @HasMedia({ modelType: "Post" })
    @RegisterMediaConversions((addConversion) => {
      addConversion("thumbnail").resize(150, 150).format("webp");
      addConversion("preview").resize(800);
    })
    class Post {}

    const factory = Reflect.getMetadata(MEDIA_CONVERSIONS_METADATA_KEY, Post);
    expect(factory).toBeDefined();

    const configs = factory();
    expect(configs).toHaveLength(2);
    expect(configs[0].name).toBe("thumbnail");
    expect(configs[0].manipulations).toHaveLength(2);
    expect(configs[1].name).toBe("preview");
  });

  it("should register in globalThis registry", () => {
    @HasMedia({ modelType: "Photo" })
    @RegisterMediaConversions((addConversion) => {
      addConversion("thumb").resize(100);
    })
    class Photo {}

    const registry = (globalThis as any).__nestbolt_media_conversions;
    expect(registry).toBeDefined();
    expect(registry.has("Photo")).toBe(true);
  });

  it("should use class name when @HasMedia not applied", () => {
    @RegisterMediaConversions((addConversion) => {
      addConversion("small").resize(50);
    })
    class Plain {}

    const registry = (globalThis as any).__nestbolt_media_conversions;
    expect(registry.has("Plain")).toBe(true);
  });

  it("should create globalThis map on first call", () => {
    (globalThis as any).__nestbolt_media_conversions = undefined;

    @RegisterMediaConversions((addConversion) => {
      addConversion("test").resize(100);
    })
    class First {}

    expect((globalThis as any).__nestbolt_media_conversions).toBeInstanceOf(Map);
  });
});
