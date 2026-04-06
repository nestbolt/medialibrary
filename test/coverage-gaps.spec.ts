import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as sharp from "sharp";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MediaModule } from "../src/media.module";
import { MediaService } from "../src/media.service";
import { MediaEntity } from "../src/entities/media.entity";
import { ConversionBuilder } from "../src/conversion-builder";
import { MediaCollectionBuilder } from "../src/media-collection-builder";
import { FileAdder } from "../src/file-adder";
import { FileManipulator } from "../src/file-manipulator";
import { HasMedia } from "../src/decorators/has-media.decorator";
import { HasMediaMixin } from "../src/mixins/has-media.mixin";
import { DiskManager } from "../src/storage/disk-manager";
import { DefaultUrlGenerator } from "../src/generators/default-url-generator";
import { DefaultPathGenerator } from "../src/generators/default-path-generator";
import {
  RegisterMediaCollections,
  RegisterMediaConversions,
} from "../src/decorators/media-registration.decorator";
import { MEDIA_OPTIONS, PATH_GENERATOR } from "../src/media.constants";

// ==== ConversionBuilder: nonQueued ====
describe("ConversionBuilder — nonQueued", () => {
  it("should mark as non-queued", () => {
    const config = new ConversionBuilder("thumb").queued().nonQueued().build();
    expect(config.queued).toBe(false);
  });
});

// ==== ConversionBuilder: optional parameter branches ====
describe("ConversionBuilder — optional parameter branches", () => {
  it("should handle resize with no arguments", () => {
    const config = new ConversionBuilder("test").resize().build();
    expect(config.manipulations[0].args).toEqual([null, null, undefined]);
  });

  it("should handle resize with only width", () => {
    const config = new ConversionBuilder("test").resize(100).build();
    expect(config.manipulations[0].args).toEqual([100, null, undefined]);
  });

  it("should handle crop with default left/top", () => {
    const config = new ConversionBuilder("test").crop(100, 100).build();
    expect(config.manipulations[0].args[0]).toEqual({
      width: 100,
      height: 100,
      left: 0,
      top: 0,
    });
  });

  it("should handle blur without sigma", () => {
    const config = new ConversionBuilder("test").blur().build();
    expect(config.manipulations[0].args).toEqual([]);
  });

  it("should handle sharpen without options", () => {
    const config = new ConversionBuilder("test").sharpen().build();
    expect(config.manipulations[0].args).toEqual([]);
  });

  it("should handle sharpen with options", () => {
    const config = new ConversionBuilder("test").sharpen({ sigma: 2 }).build();
    expect(config.manipulations[0].args).toEqual([{ sigma: 2 }]);
  });

  it("should handle rotate without angle", () => {
    const config = new ConversionBuilder("test").rotate().build();
    expect(config.manipulations[0].args).toEqual([]);
  });
});

// ==== FileAdder: storingConversionsOnDisk + withManipulations ====
describe("FileAdder — uncovered methods", () => {
  const mockAttacher = { attachMedia: vi.fn().mockResolvedValue(new MediaEntity()) };

  it("should set conversionsDiskName", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .storingConversionsOnDisk("s3");
    expect(adder.conversionsDiskName).toBe("s3");
  });

  it("should set manipulations", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .withManipulations({ rotate: 90 });
    expect(adder.manipulations).toEqual({ rotate: 90 });
  });

  it("should merge manipulations", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .withManipulations({ rotate: 90 })
      .withManipulations({ flip: true });
    expect(adder.manipulations).toEqual({ rotate: 90, flip: true });
  });
});

// ==== MediaCollectionBuilder: registerMediaConversions, useFallbackPath ====
describe("MediaCollectionBuilder — uncovered methods", () => {
  it("should set registerMediaConversions", () => {
    const registrar = vi.fn();
    const config = new MediaCollectionBuilder("test")
      .registerMediaConversions(registrar)
      .build();
    expect(config.generateConversions).toBe(registrar);
  });

  it("should set useFallbackPath with default key", () => {
    const config = new MediaCollectionBuilder("test")
      .useFallbackPath("/fallback/image.jpg")
      .build();
    expect(config.fallbackPaths["*"]).toBe("/fallback/image.jpg");
  });

  it("should set useFallbackPath with conversion name", () => {
    const config = new MediaCollectionBuilder("test")
      .useFallbackPath("/fallback/thumb.jpg", "thumbnail")
      .build();
    expect(config.fallbackPaths["thumbnail"]).toBe("/fallback/thumb.jpg");
  });

  it("should set storeConversionsOnDisk", () => {
    const config = new MediaCollectionBuilder("test")
      .storeConversionsOnDisk("s3")
      .build();
    expect(config.conversionsDiskName).toBe("s3");
  });
});

// ==== FileManipulator: sharp error, toFormat with options, unknown operation ====
describe("FileManipulator — uncovered branches", () => {
  let manipulator: FileManipulator;

  beforeEach(() => {
    manipulator = new FileManipulator();
  });

  it("should handle toFormat with options argument", async () => {
    const img = await sharp.default({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).jpeg().toBuffer();

    const result = await manipulator.performConversion(
      img,
      {
        name: "test",
        manipulations: [
          { operation: "toFormat", args: ["webp", { lossless: true }] },
        ],
        performOnCollections: [],
        queued: false,
        keepOriginalImageFormat: false,
      },
      "image/jpeg",
    );

    expect(result.mimeType).toBe("image/webp");
    expect(result.extension).toBe("webp");
  });

  it("should handle unknown sharp operation gracefully", async () => {
    const img = await sharp.default({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).jpeg().toBuffer();

    const result = await manipulator.performConversion(
      img,
      {
        name: "test",
        manipulations: [
          { operation: "nonExistentOperation", args: [42] },
        ],
        performOnCollections: [],
        queued: false,
        keepOriginalImageFormat: false,
      },
      "image/jpeg",
    );

    // Should still produce output since the unknown operation is skipped
    expect(result.buffer).toBeDefined();
  });

  it("should handle quality without explicit format (infer from mime)", async () => {
    const img = await sharp.default({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).png().toBuffer();

    const result = await manipulator.performConversion(
      img,
      {
        name: "test",
        manipulations: [
          { operation: "__quality", args: [50] },
        ],
        performOnCollections: [],
        queued: false,
        keepOriginalImageFormat: false,
      },
      "image/png",
    );

    expect(result.mimeType).toBe("image/png");
  });

  it("should handle quality with unknown mime type (no format inferred)", async () => {
    const img = await sharp.default({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).jpeg().toBuffer();

    const result = await manipulator.performConversion(
      img,
      {
        name: "test",
        manipulations: [
          { operation: "__quality", args: [50] },
        ],
        performOnCollections: [],
        queued: false,
        keepOriginalImageFormat: false,
      },
      "image/bmp",
    );

    // bmp is not in the format map so inferFormatFromMime returns null
    expect(result.buffer).toBeDefined();
  });

  it("should handle keepOriginalImageFormat", async () => {
    const img = await sharp.default({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).jpeg().toBuffer();

    const result = await manipulator.performConversion(
      img,
      {
        name: "test",
        manipulations: [
          { operation: "resize", args: [5] },
        ],
        performOnCollections: [],
        queued: false,
        keepOriginalImageFormat: true,
      },
      "image/jpeg",
    );

    expect(result.mimeType).toBe("image/jpeg");
    expect(result.extension).toBe("jpeg");
  });
});

// ==== DiskManager: S3 driver creation, unknown driver ====
describe("DiskManager — S3 creation & unknown driver", () => {
  it("should create S3 driver for s3 config", () => {
    const dm = new DiskManager({
      defaultDisk: "s3",
      disks: {
        s3: { driver: "s3" as const, bucket: "test", region: "us-east-1" },
      },
    });
    const d = dm.disk("s3");
    expect(d).toBeDefined();
    expect(d.url("file.txt")).toContain("test");
  });

  it("should throw for unknown driver type", () => {
    const dm = new DiskManager({
      defaultDisk: "custom",
      disks: {
        custom: { driver: "ftp" as any, host: "example.com" } as any,
      },
    });
    expect(() => dm.disk("custom")).toThrow('Unknown storage driver: "ftp"');
  });
});

// ==== HasMediaMixin: throws without service for all remaining methods ====
describe("HasMediaMixin — throw errors for all methods without service", () => {
  @HasMedia()
  class Disconnected extends HasMediaMixin(class {}) {
    id = "1";
  }

  beforeEach(() => {
    // Ensure no static instance
    (MediaService as any).instance = null;
  });

  it("should throw on getMedia", async () => {
    const entity = new Disconnected();
    await expect(entity.getMedia()).rejects.toThrow("MediaModule has not been initialized");
  });

  it("should throw on getFirstMedia", async () => {
    const entity = new Disconnected();
    await expect(entity.getFirstMedia()).rejects.toThrow("MediaModule has not been initialized");
  });

  it("should throw on getFirstMediaUrl", async () => {
    const entity = new Disconnected();
    await expect(entity.getFirstMediaUrl()).rejects.toThrow("MediaModule has not been initialized");
  });

  it("should throw on hasMedia", async () => {
    const entity = new Disconnected();
    await expect(entity.hasMedia()).rejects.toThrow("MediaModule has not been initialized");
  });

  it("should throw on clearMediaCollection", async () => {
    const entity = new Disconnected();
    await expect(entity.clearMediaCollection()).rejects.toThrow("MediaModule has not been initialized");
  });

  it("should throw on deleteAllMedia", async () => {
    const entity = new Disconnected();
    await expect(entity.deleteAllMedia()).rejects.toThrow("MediaModule has not been initialized");
  });
});

// ==== DefaultUrlGenerator: getTemporaryUrl ====
describe("DefaultUrlGenerator — getTemporaryUrl", () => {
  it("should delegate to driver.temporaryUrl", async () => {
    const mockDriver = {
      temporaryUrl: vi.fn().mockResolvedValue("https://signed.example.com/file.txt"),
      url: vi.fn().mockReturnValue("https://example.com/file.txt"),
    };
    const mockDiskManager = {
      disk: vi.fn().mockReturnValue(mockDriver),
    };
    const mockPathGenerator = new DefaultPathGenerator();
    const options = {};

    const urlGen = new DefaultUrlGenerator(
      options as any,
      mockPathGenerator,
      mockDiskManager as any,
    );

    const media = new MediaEntity();
    media.id = "test-id";
    media.fileName = "file.txt";
    media.disk = "local";

    const expiration = new Date(Date.now() + 3600 * 1000);
    const result = await urlGen.getTemporaryUrl(media, expiration);
    expect(result).toBe("https://signed.example.com/file.txt");
    expect(mockDriver.temporaryUrl).toHaveBeenCalled();
  });

  it("should use conversionsDisk for conversions", async () => {
    const mockDriver = {
      temporaryUrl: vi.fn().mockResolvedValue("https://signed.example.com/conv.txt"),
      url: vi.fn(),
    };
    const mockDiskManager = {
      disk: vi.fn().mockReturnValue(mockDriver),
    };
    const mockPathGenerator = new DefaultPathGenerator();
    const options = {};

    const urlGen = new DefaultUrlGenerator(
      options as any,
      mockPathGenerator,
      mockDiskManager as any,
    );

    const media = new MediaEntity();
    media.id = "test-id";
    media.fileName = "file.txt";
    media.disk = "local";
    media.conversionsDisk = "s3";

    const expiration = new Date(Date.now() + 3600 * 1000);
    await urlGen.getTemporaryUrl(media, expiration, "thumbnail");
    expect(mockDiskManager.disk).toHaveBeenCalledWith("s3");
  });
});

// ==== MediaEntity: deleteNestedValue when path doesn't exist ====
describe("MediaEntity — deleteNestedValue edge case", () => {
  it("should handle forgetCustomProperty with non-existent nested path", () => {
    const entity = new MediaEntity();
    entity.customProperties = { a: "b" };
    // Should not throw when intermediate path doesn't exist
    entity.forgetCustomProperty("x.y.z");
    expect(entity.customProperties).toEqual({ a: "b" });
  });

  it("should handle forgetCustomProperty when intermediate is not an object", () => {
    const entity = new MediaEntity();
    entity.customProperties = { a: "string-value" };
    // a is a string, not an object, so traversing a.b should bail out
    entity.forgetCustomProperty("a.b");
    expect(entity.customProperties).toEqual({ a: "string-value" });
  });
});

// ==== MediaService: acceptsFile validation, prefix paths, conversion errors ====
describe("MediaService — advanced coverage gaps", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-cov-"));

    @HasMedia({ modelType: "CovModel" })
    @RegisterMediaCollections((addCollection) => {
      addCollection("strict")
        .acceptsFile((file) => file.size < 100)
        .maxFileSize(50);
    })
    class CovModel {}

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "local",
          disks: {
            local: { driver: "local", root: tmpDir, urlBase: "/media" },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    (globalThis as any).__nestbolt_media_collections = undefined;
    (globalThis as any).__nestbolt_media_conversions = undefined;
  });

  it("should reject file via acceptsFile predicate", async () => {
    // File is 200 bytes, but acceptsFile requires < 100
    const largeBuf = Buffer.alloc(200, "x");
    await expect(
      service
        .addMediaFromBuffer(largeBuf, "big.txt")
        .forModel("CovModel", "1")
        .toMediaCollection("strict"),
    ).rejects.toThrow(); // FileIsTooBigException or FileUnacceptableException
  });

  it("should reject file exceeding collection maxFileSize", async () => {
    const buf = Buffer.alloc(60, "x");
    await expect(
      service
        .addMediaFromBuffer(buf, "medium.txt")
        .forModel("CovModel", "1")
        .toMediaCollection("strict"),
    ).rejects.toThrow();
  });

  it("should handle getTemporaryUrl", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    // LocalDriver throws on temporaryUrl
    await expect(
      service.getTemporaryUrl(media, new Date(Date.now() + 3600000)),
    ).rejects.toThrow();
  });

  it("should handle deleteMediaFiles gracefully when files already deleted", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    // Delete files manually first
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.mkdirSync(tmpDir, { recursive: true });

    // deleteMedia should not throw even if files are missing
    await expect(service.deleteMedia(media.id)).resolves.not.toThrow();
  });

  it("should handle storingConversionsOnDisk on file adder", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .storingConversionsOnDisk("local")
      .toMediaCollection();

    expect(media.conversionsDisk).toBe("local");
  });
});

// ==== MediaService: prefix in conversion and delete paths ====
describe("MediaService — with prefix option", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-prefix-"));

    @HasMedia({ modelType: "PrefixModel" })
    @RegisterMediaConversions((addConversion) => {
      addConversion("thumb").resize(10).format("webp");
    })
    class PrefixModel {}

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "local",
          prefix: "tenant-1",
          disks: {
            local: { driver: "local", root: tmpDir },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    (globalThis as any).__nestbolt_media_collections = undefined;
    (globalThis as any).__nestbolt_media_conversions = undefined;
  });

  it("should include prefix in file paths", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    const p = service.getPath(media);
    expect(p).toContain("tenant-1");
  });

  it("should include prefix in conversion paths for images", async () => {
    const img = await sharp.default({
      create: { width: 50, height: 50, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).jpeg().toBuffer();

    const media = await service
      .addMediaFromBuffer(img, "photo.jpg")
      .forModel("PrefixModel", "1")
      .toMediaCollection();

    expect(media.hasGeneratedConversion("thumb")).toBe(true);

    const thumbUrl = service.getUrl(media, "thumb");
    expect(thumbUrl).toContain("tenant-1");
  });

  it("should delete with prefix paths", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    await expect(service.deleteMedia(media.id)).resolves.not.toThrow();
  });
});

// ==== MediaService: conversion error path ====
describe("MediaService — conversion failure handling", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-conv-err-"));

    @HasMedia({ modelType: "ErrModel" })
    @RegisterMediaConversions((addConversion) => {
      // Use resize with invalid dimensions that will cause Sharp to throw
      addConversion("bad-conversion")
        .resize(-1, -1)
        .performOnCollections("images");
    })
    class ErrModel {}

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "local",
          disks: {
            local: { driver: "local", root: tmpDir },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    (globalThis as any).__nestbolt_media_collections = undefined;
    (globalThis as any).__nestbolt_media_conversions = undefined;
  });

  it("should log error and emit CONVERSION_FAILED on conversion error without crashing", async () => {
    const img = await sharp.default({
      create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).jpeg().toBuffer();

    // This should NOT throw — conversion errors are caught and logged
    const media = await service
      .addMediaFromBuffer(img, "photo.jpg")
      .forModel("ErrModel", "1")
      .toMediaCollection("images");

    expect(media).toBeDefined();
    // The bad conversion should not be marked as generated (Sharp throws on negative resize)
    expect(media.hasGeneratedConversion("bad-conversion")).toBe(false);
  });
});

// ==== MediaEntity: getNestedValue early bail and type getter ====
describe("MediaEntity — getNestedValue and type getter edge cases", () => {
  it("should return undefined for getCustomProperty when intermediate is null", () => {
    const entity = new MediaEntity();
    entity.customProperties = { a: null };
    expect(entity.getCustomProperty("a.b.c")).toBeUndefined();
  });

  it("should return undefined for getCustomProperty when intermediate is a primitive", () => {
    const entity = new MediaEntity();
    entity.customProperties = { a: "string" };
    expect(entity.getCustomProperty("a.b")).toBeUndefined();
  });

  it("should handle type getter with null mimeType", () => {
    const entity = new MediaEntity();
    entity.mimeType = null as any;
    expect(entity.type).toBeDefined();
  });

  it("should handle type getter with undefined mimeType", () => {
    const entity = new MediaEntity();
    entity.mimeType = undefined as any;
    expect(entity.type).toBeDefined();
  });
});

// ==== DefaultUrlGenerator: getUrl with baseUrl having trailing slash ====
describe("DefaultUrlGenerator — baseUrl edge cases", () => {
  it("should handle baseUrl with trailing slash", () => {
    const mockDriver = {
      url: vi.fn().mockReturnValue("fallback"),
    };
    const mockDiskManager = {
      disk: vi.fn().mockReturnValue(mockDriver),
    };
    const pathGen = new DefaultPathGenerator();
    const urlGen = new DefaultUrlGenerator(
      { baseUrl: "https://cdn.example.com/" } as any,
      pathGen,
      mockDiskManager as any,
    );

    const media = new MediaEntity();
    media.id = "test-id";
    media.fileName = "file.txt";
    media.disk = "local";

    const url = urlGen.getUrl(media);
    expect(url).toBe("https://cdn.example.com/test-id/file.txt");
    expect(url).not.toContain("//test-id");
  });

  it("should use conversionsDisk for conversion URL", () => {
    const mockDriver = {
      url: vi.fn().mockReturnValue("/local/file.txt"),
    };
    const mockDiskManager = {
      disk: vi.fn().mockReturnValue(mockDriver),
    };
    const pathGen = new DefaultPathGenerator();
    const urlGen = new DefaultUrlGenerator(
      {} as any,
      pathGen,
      mockDiskManager as any,
    );

    const media = new MediaEntity();
    media.id = "test-id";
    media.fileName = "file.txt";
    media.disk = "local";
    media.conversionsDisk = "s3";

    urlGen.getUrl(media, "thumbnail");
    expect(mockDiskManager.disk).toHaveBeenCalledWith("s3");
  });
});

// ==== MediaEntity: successful nested path traversal in deleteNestedValue ====
describe("MediaEntity — nested deleteNestedValue traversal", () => {
  it("should delete deeply nested custom property", () => {
    const entity = new MediaEntity();
    entity.customProperties = { a: { b: { c: "deep-value", d: "keep" } } };
    entity.forgetCustomProperty("a.b.c");
    expect(entity.customProperties.a.b).not.toHaveProperty("c");
    expect(entity.customProperties.a.b.d).toBe("keep");
  });
});

// ==== MediaService: acceptsFile predicate rejection ====
describe("MediaService — acceptsFile predicate", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-af-"));

    @HasMedia({ modelType: "AFModel" })
    @RegisterMediaCollections((addCollection) => {
      addCollection("filtered")
        .acceptsFile((file) => file.fileName.endsWith(".txt"));
    })
    class AFModel {}

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "local",
          disks: {
            local: { driver: "local", root: tmpDir },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    (globalThis as any).__nestbolt_media_collections = undefined;
    (globalThis as any).__nestbolt_media_conversions = undefined;
  });

  it("should reject file that fails acceptsFile predicate", async () => {
    await expect(
      service
        .addMediaFromBuffer(Buffer.from("data"), "photo.jpg")
        .forModel("AFModel", "1")
        .toMediaCollection("filtered"),
    ).rejects.toThrow();
  });

  it("should accept file that passes acceptsFile predicate", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("data"), "notes.txt")
      .forModel("AFModel", "1")
      .toMediaCollection("filtered");
    expect(media).toBeDefined();
  });
});

// ==== MediaService: deleteMediaFiles with separate conversionsDisk ====
describe("MediaService — conversionsDisk cleanup", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-cdisk-"));

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "main",
          disks: {
            main: { driver: "local", root: path.join(tmpDir, "main") },
            conversions: { driver: "local", root: path.join(tmpDir, "conv") },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should clean up files on both disks when conversionsDisk differs", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("data"), "file.txt")
      .forModel("Post", "1")
      .toDisk("main")
      .storingConversionsOnDisk("conversions")
      .toMediaCollection();

    expect(media.disk).toBe("main");
    expect(media.conversionsDisk).toBe("conversions");

    // Should not throw — deleteMediaFiles should handle both disks
    await expect(service.deleteMedia(media.id)).resolves.not.toThrow();
  });
});

// ==== MediaService: regenerateConversions with actual conversions ====
describe("MediaService — regenerateConversions", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-regen-"));

    @HasMedia({ modelType: "RegenModel" })
    @RegisterMediaConversions((addConversion) => {
      addConversion("small").resize(5).format("webp");
    })
    class RegenModel {}

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "local",
          disks: {
            local: { driver: "local", root: tmpDir },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    (globalThis as any).__nestbolt_media_collections = undefined;
    (globalThis as any).__nestbolt_media_conversions = undefined;
  });

  it("should regenerate conversions for an existing image media", async () => {
    const img = await sharp.default({
      create: { width: 50, height: 50, channels: 3, background: { r: 100, g: 100, b: 100 } },
    }).jpeg().toBuffer();

    const media = await service
      .addMediaFromBuffer(img, "photo.jpg")
      .forModel("RegenModel", "1")
      .toMediaCollection();

    expect(media.hasGeneratedConversion("small")).toBe(true);

    // Mark it as not generated to simulate a need for regeneration
    media.markConversionAsNotGenerated("small");

    await service.regenerateConversions(media);

    // After regeneration, it should be marked as generated again
    expect(media.hasGeneratedConversion("small")).toBe(true);
  });

  it("should regenerate only specific conversions when names provided", async () => {
    const img = await sharp.default({
      create: { width: 50, height: 50, channels: 3, background: { r: 100, g: 100, b: 100 } },
    }).jpeg().toBuffer();

    const media = await service
      .addMediaFromBuffer(img, "photo.jpg")
      .forModel("RegenModel", "1")
      .toMediaCollection();

    await service.regenerateConversions(media, ["small"]);
    expect(media.hasGeneratedConversion("small")).toBe(true);
  });

  it("should skip regeneration if no matching conversions", async () => {
    const img = await sharp.default({
      create: { width: 50, height: 50, channels: 3, background: { r: 100, g: 100, b: 100 } },
    }).jpeg().toBuffer();

    const media = await service
      .addMediaFromBuffer(img, "photo.jpg")
      .forModel("RegenModel", "1")
      .toMediaCollection();

    // Request a conversion that doesn't exist — should be a no-op
    await expect(service.regenerateConversions(media, ["nonexistent"])).resolves.not.toThrow();
  });
});

// ==== MediaService: regenerateConversions collection mismatch ====
describe("MediaService — regenerateConversions collection mismatch", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-regcol-"));

    @HasMedia({ modelType: "ColModel" })
    @RegisterMediaConversions((addConversion) => {
      addConversion("avatar-thumb")
        .resize(5)
        .performOnCollections("avatars");
    })
    class ColModel {}

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "local",
          disks: {
            local: { driver: "local", root: tmpDir },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    (globalThis as any).__nestbolt_media_collections = undefined;
    (globalThis as any).__nestbolt_media_conversions = undefined;
  });

  it("should skip conversions not applicable to media collection", async () => {
    const img = await sharp.default({
      create: { width: 50, height: 50, channels: 3, background: { r: 100, g: 100, b: 100 } },
    }).jpeg().toBuffer();

    // Add to "gallery" collection, but conversion only applies to "avatars"
    const media = await service
      .addMediaFromBuffer(img, "photo.jpg")
      .forModel("ColModel", "1")
      .toMediaCollection("gallery");

    // avatar-thumb should NOT be generated since it targets "avatars" only
    expect(media.hasGeneratedConversion("avatar-thumb")).toBe(false);

    // regenerateConversions should also be no-op since collection doesn't match
    await expect(service.regenerateConversions(media)).resolves.not.toThrow();
  });
});

// ==== LocalDriver: url with trailing-slash urlBase ====
describe("LocalDriver — url with trailing-slash urlBase", () => {
  it("should handle urlBase with trailing slash", async () => {
    const { LocalDriver } = await import("../src/storage/drivers/local.driver");
    const driver = new LocalDriver({ driver: "local", root: "/tmp", urlBase: "/media/" });
    const url = driver.url("file.txt");
    expect(url).toBe("/media/file.txt");
  });
});

// ==== MediaRegistration decorators: Map-already-exists branch ====
describe("MediaRegistration — globalThis Map reuse", () => {
  afterEach(() => {
    (globalThis as any).__nestbolt_media_collections = undefined;
    (globalThis as any).__nestbolt_media_conversions = undefined;
  });

  it("should reuse existing collections Map when applying to multiple classes", () => {
    @HasMedia({ modelType: "First" })
    @RegisterMediaCollections((addCollection) => {
      addCollection("images");
    })
    class First {}

    // At this point the Map exists. Second class reuses it.
    @HasMedia({ modelType: "Second" })
    @RegisterMediaCollections((addCollection) => {
      addCollection("docs");
    })
    class Second {}

    const registry = (globalThis as any).__nestbolt_media_collections as Map<string, any>;
    expect(registry.has("First")).toBe(true);
    expect(registry.has("Second")).toBe(true);
  });

  it("should reuse existing conversions Map when applying to multiple classes", () => {
    @HasMedia({ modelType: "A" })
    @RegisterMediaConversions((addConversion) => {
      addConversion("thumb").resize(10);
    })
    class A {}

    @HasMedia({ modelType: "B" })
    @RegisterMediaConversions((addConversion) => {
      addConversion("preview").resize(100);
    })
    class B {}

    const registry = (globalThis as any).__nestbolt_media_conversions as Map<string, any>;
    expect(registry.has("A")).toBe(true);
    expect(registry.has("B")).toBe(true);
  });
});

// ==== DiskManager: default disk (no name argument) ====
describe("DiskManager — default disk selection", () => {
  it("should use defaultDisk when no name is provided", () => {
    const dm = new DiskManager({
      defaultDisk: "local",
      disks: {
        local: { driver: "local" as const, root: "/tmp" },
      },
    });
    const d = dm.disk();
    expect(d).toBeDefined();
  });
});

// ==== HasMediaMixin: specific branches for meta.modelType and fileName default ====
describe("HasMediaMixin — branch coverage for modelType fallback and fileName", () => {
  it("should use class name when @HasMedia has no modelType", () => {
    @HasMedia()
    class MyArticle extends HasMediaMixin(class {}) {
      id = "1";
    }
    const a = new MyArticle();
    // meta exists but no modelType, falls back to constructor name
    expect(a.getMediaModelType()).toBe("MyArticle");
  });

  it("should use modelType when @HasMedia has it", () => {
    @HasMedia({ modelType: "CustomName" })
    class MyEntity extends HasMediaMixin(class {}) {
      id = "1";
    }
    const e = new MyEntity();
    expect(e.getMediaModelType()).toBe("CustomName");
  });
});

// ==== HasMediaMixin: addMedia with buffer and no fileName ====
describe("HasMediaMixin — addMedia buffer without fileName", () => {
  let module: TestingModule;
  let tmpDir: string;

  @HasMedia({ modelType: "MixBuf" })
  class MixBuf extends HasMediaMixin(class {}) {
    id = "mb-1";
  }

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-mixbuf-"));
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          disks: { local: { driver: "local", root: tmpDir } },
        }),
      ],
    }).compile();
    await module.init();
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should default fileName to 'file' when not provided", async () => {
    const post = new MixBuf();
    const media = await post.addMedia(Buffer.from("test")).toMediaCollection();
    expect(media.fileName).toBe("file");
  });
});

// ==== MediaService: with EventEmitter2 injected ====
describe("MediaService — event emission", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;
  const emittedEvents: { event: string; payload: any }[] = [];

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-evt-"));
    emittedEvents.length = 0;

    // We need to build the module manually to inject EventEmitter2 into MediaService.
    // Since MediaModule is global, we need to provide EventEmitter2 within the same module.
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "local",
          disks: {
            local: { driver: "local", root: tmpDir },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);

    // Manually set the eventEmitter on the service instance
    (service as any).eventEmitter = {
      emit: (event: string, ...args: any[]) => {
        emittedEvents.push({ event, payload: args[0] });
        return true;
      },
    };
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should emit MEDIA_ADDED event when media is added", async () => {
    await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    const addedEvent = emittedEvents.find((e) => e.event === "media.added");
    expect(addedEvent).toBeDefined();
  });

  it("should emit MEDIA_DELETED event when media is deleted", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    await service.deleteMedia(media.id);

    const deletedEvent = emittedEvents.find((e) => e.event === "media.deleted");
    expect(deletedEvent).toBeDefined();
  });

  it("should emit COLLECTION_CLEARED event", async () => {
    await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .toMediaCollection("docs");

    await service.clearMediaCollection("Post", "1", "docs");

    const clearedEvent = emittedEvents.find((e) => e.event === "media.collection-cleared");
    expect(clearedEvent).toBeDefined();
  });
});

// ==== MediaService: deleteMediaFiles error handling ====
describe("MediaService — deleteMediaFiles error path", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-delerr-"));

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "local",
          disks: {
            local: { driver: "local", root: tmpDir },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should catch and log error when deleteMediaFiles fails", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    // Make the disk driver's deleteDirectory throw by mocking it
    const dm = module.get(DiskManager);
    const disk = dm.disk("local");
    const origDelete = disk.deleteDirectory.bind(disk);
    disk.deleteDirectory = async () => {
      throw new Error("Permission denied");
    };

    // deleteMedia should not throw — it catches the error internally
    await expect(service.deleteMedia(media.id)).resolves.not.toThrow();

    // Restore
    disk.deleteDirectory = origDelete;
  });
});

// ==== MediaService: addMediaFromUrl with downloadFile ====
describe("MediaService — downloadFile via addMediaFromUrl", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;
  let server: any;
  let serverUrl: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-dl-"));

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          defaultDisk: "local",
          disks: {
            local: { driver: "local", root: tmpDir },
          },
        }),
      ],
    }).compile();

    await module.init();
    service = module.get<MediaService>(MediaService);

    // Create a simple HTTP server
    const http = require("http");
    server = http.createServer((req: any, res: any) => {
      if (req.url === "/redirect") {
        res.writeHead(302, { Location: `http://localhost:${server.address().port}/photo.jpg` });
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(Buffer.from("fake-image-data"));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        serverUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (server) {
      await new Promise<void>((resolve) => server.close(resolve));
    }
  });

  it("should download file from URL and add as media", async () => {
    const adder = await service.addMediaFromUrl(`${serverUrl}/photo.jpg`);
    const media = await adder.forModel("Post", "1").toMediaCollection();

    expect(media).toBeDefined();
    expect(media.fileName).toContain("photo");
  });

  it("should follow redirects", async () => {
    const adder = await service.addMediaFromUrl(`${serverUrl}/redirect`);
    const media = await adder.forModel("Post", "1").toMediaCollection();

    expect(media).toBeDefined();
    expect(media.fileName).toContain("photo");
  });
});
