import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MediaModule } from "../src/media.module";
import { MediaService } from "../src/media.service";
import { MediaEntity } from "../src/entities/media.entity";

describe("MediaService", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-media-svc-"));
    testFilePath = path.join(tmpDir, "test-image.txt");
    fs.writeFileSync(testFilePath, "test file content");

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
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should have static instance after init", () => {
    expect(MediaService.getInstance()).toBe(service);
  });

  it("should add media from buffer", async () => {
    const buffer = Buffer.from("hello world");
    const media = await service
      .addMediaFromBuffer(buffer, "hello.txt")
      .forModel("Post", "1")
      .toMediaCollection("documents");

    expect(media).toBeDefined();
    expect(media.id).toBeDefined();
    expect(media.modelType).toBe("Post");
    expect(media.modelId).toBe("1");
    expect(media.collectionName).toBe("documents");
    expect(media.fileName).toBe("hello.txt");
    expect(media.mimeType).toBe("text/plain");
    expect(Number(media.size)).toBe(11);
  });

  it("should add media from file path", async () => {
    const media = await service
      .addMedia(testFilePath)
      .forModel("Post", "1")
      .toMediaCollection();

    expect(media).toBeDefined();
    expect(media.fileName).toBe("test-image.txt");
    expect(media.collectionName).toBe("default");
  });

  it("should add media with custom properties", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .withCustomProperties({ alt: "Test", credit: "Author" })
      .toMediaCollection();

    expect(media.getCustomProperty("alt")).toBe("Test");
    expect(media.getCustomProperty("credit")).toBe("Author");
  });

  it("should add media with custom name", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .usingName("My Document")
      .toMediaCollection();

    expect(media.name).toBe("My Document");
  });

  it("should retrieve media", async () => {
    const m1 = await service
      .addMediaFromBuffer(Buffer.from("a"), "a.txt")
      .forModel("Post", "1")
      .setOrder(0)
      .toMediaCollection("docs");

    const m2 = await service
      .addMediaFromBuffer(Buffer.from("b"), "b.txt")
      .forModel("Post", "1")
      .setOrder(1)
      .toMediaCollection("docs");

    const all = await service.getMedia("Post", "1", "docs");
    expect(all).toHaveLength(2);

    const first = await service.getFirstMedia("Post", "1", "docs");
    expect(first).toBeDefined();
    expect(first!.fileName).toBe("a.txt");

    const last = await service.getLastMedia("Post", "1", "docs");
    expect(last).toBeDefined();
    expect(last!.fileName).toBe("b.txt");
  });

  it("should check if entity has media", async () => {
    expect(await service.hasMedia("Post", "1", "images")).toBe(false);

    await service
      .addMediaFromBuffer(Buffer.from("test"), "test.txt")
      .forModel("Post", "1")
      .toMediaCollection("images");

    expect(await service.hasMedia("Post", "1", "images")).toBe(true);
    expect(await service.hasMedia("Post", "1", "documents")).toBe(false);
  });

  it("should generate URLs", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "photo.jpg")
      .forModel("Post", "1")
      .toMediaCollection();

    const url = service.getUrl(media);
    expect(url).toContain("photo.jpg");
    expect(url).toContain(media.id);
  });

  it("should delete a specific media item", async () => {
    const media = await service
      .addMediaFromBuffer(Buffer.from("test"), "file.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    await service.deleteMedia(media.id);

    const found = await service.getFirstMedia("Post", "1");
    expect(found).toBeNull();
  });

  it("should delete all media for an entity", async () => {
    await service
      .addMediaFromBuffer(Buffer.from("a"), "a.txt")
      .forModel("Post", "1")
      .toMediaCollection("docs");

    await service
      .addMediaFromBuffer(Buffer.from("b"), "b.txt")
      .forModel("Post", "1")
      .toMediaCollection("images");

    await service.deleteAllMedia("Post", "1");

    expect(await service.hasMedia("Post", "1")).toBe(false);
  });

  it("should clear a specific collection", async () => {
    await service
      .addMediaFromBuffer(Buffer.from("a"), "a.txt")
      .forModel("Post", "1")
      .toMediaCollection("docs");

    await service
      .addMediaFromBuffer(Buffer.from("b"), "b.txt")
      .forModel("Post", "1")
      .toMediaCollection("images");

    await service.clearMediaCollection("Post", "1", "docs");

    expect(await service.hasMedia("Post", "1", "docs")).toBe(false);
    expect(await service.hasMedia("Post", "1", "images")).toBe(true);
  });

  it("should set ordering", async () => {
    const m1 = await service
      .addMediaFromBuffer(Buffer.from("1"), "first.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    const m2 = await service
      .addMediaFromBuffer(Buffer.from("2"), "second.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    await service.setOrder([m2.id, m1.id]);

    const first = await service.getFirstMedia("Post", "1");
    expect(first!.id).toBe(m2.id);
  });

  it("should reject files exceeding max size", async () => {
    const tinyModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot({
          maxFileSize: 10,
          disks: { local: { driver: "local", root: tmpDir } },
        }),
      ],
    }).compile();

    await tinyModule.init();
    const tinyService = tinyModule.get<MediaService>(MediaService);

    await expect(
      tinyService
        .addMediaFromBuffer(Buffer.alloc(100), "big.txt")
        .forModel("Post", "1")
        .toMediaCollection(),
    ).rejects.toThrow("exceeds the maximum");

    await tinyModule.close();
  });

  it("should add media from base64", async () => {
    const original = "Hello base64 world";
    const base64 = Buffer.from(original).toString("base64");

    const media = await service
      .addMediaFromBase64(base64, "encoded.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    expect(media).toBeDefined();
    expect(media.fileName).toBe("encoded.txt");
    expect(Number(media.size)).toBe(original.length);
  });

  it("should handle base64 with data URI prefix", async () => {
    const original = "data content";
    const base64 = `data:text/plain;base64,${Buffer.from(original).toString("base64")}`;

    const media = await service
      .addMediaFromBase64(base64, "data.txt")
      .forModel("Post", "1")
      .toMediaCollection();

    expect(media).toBeDefined();
    expect(Number(media.size)).toBe(original.length);
  });
});
