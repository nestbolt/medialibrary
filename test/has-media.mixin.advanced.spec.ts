import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MediaModule } from "../src/media.module";
import { MediaService } from "../src/media.service";
import { MediaEntity } from "../src/entities/media.entity";
import { HasMedia } from "../src/decorators/has-media.decorator";
import { HasMediaMixin } from "../src/mixins/has-media.mixin";

describe("HasMediaMixin (with real service)", () => {
  let module: TestingModule;
  let service: MediaService;
  let tmpDir: string;

  @HasMedia({ modelType: "TestPost" })
  class TestPost extends HasMediaMixin(class {}) {
    id = "post-1";
  }

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-mixin-test-"));
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
    service = module.get<MediaService>(MediaService);
  });

  afterEach(async () => {
    await module?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should addMedia via mixin with buffer", async () => {
    const post = new TestPost();
    const media = await post.addMedia(Buffer.from("data"), "test.txt").toMediaCollection("docs");
    expect(media).toBeDefined();
    expect(media.modelType).toBe("TestPost");
    expect(media.modelId).toBe("post-1");
  });

  it("should addMedia via mixin with file path", async () => {
    const filePath = path.join(tmpDir, "src-file.txt");
    fs.writeFileSync(filePath, "hello from file");

    const post = new TestPost();
    const media = await post.addMedia(filePath).toMediaCollection();
    expect(media).toBeDefined();
    expect(media.fileName).toContain("src-file");
  });

  it("should getMedia via mixin", async () => {
    const post = new TestPost();
    await post.addMedia(Buffer.from("a"), "a.txt").toMediaCollection("docs");
    await post.addMedia(Buffer.from("b"), "b.txt").toMediaCollection("docs");

    const media = await post.getMedia("docs");
    expect(media).toHaveLength(2);
  });

  it("should getFirstMedia via mixin", async () => {
    const post = new TestPost();
    await post.addMedia(Buffer.from("x"), "x.txt").setOrder(0).toMediaCollection();

    const first = await post.getFirstMedia();
    expect(first).toBeDefined();
    expect(first!.fileName).toBe("x.txt");
  });

  it("should getFirstMediaUrl via mixin", async () => {
    const post = new TestPost();
    await post.addMedia(Buffer.from("test"), "photo.jpg").toMediaCollection("images");

    const url = await post.getFirstMediaUrl("images");
    expect(url).toContain("photo.jpg");
  });

  it("should return null for getFirstMediaUrl when no media", async () => {
    const post = new TestPost();
    const url = await post.getFirstMediaUrl("nonexistent");
    expect(url).toBeNull();
  });

  it("should hasMedia via mixin", async () => {
    const post = new TestPost();
    expect(await post.hasMedia("docs")).toBe(false);

    await post.addMedia(Buffer.from("test"), "test.txt").toMediaCollection("docs");
    expect(await post.hasMedia("docs")).toBe(true);
  });

  it("should clearMediaCollection via mixin", async () => {
    const post = new TestPost();
    await post.addMedia(Buffer.from("a"), "a.txt").toMediaCollection("docs");
    await post.addMedia(Buffer.from("b"), "b.txt").toMediaCollection("docs");

    await post.clearMediaCollection("docs");
    expect(await post.hasMedia("docs")).toBe(false);
  });

  it("should deleteAllMedia via mixin", async () => {
    const post = new TestPost();
    await post.addMedia(Buffer.from("a"), "a.txt").toMediaCollection("docs");
    await post.addMedia(Buffer.from("b"), "b.txt").toMediaCollection("images");

    await post.deleteAllMedia();
    expect(await post.hasMedia()).toBe(false);
  });
});
