import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { LocalDriver } from "../src/storage/drivers/local.driver";

describe("LocalDriver", () => {
  let tmpDir: string;
  let driver: LocalDriver;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nestbolt-media-test-"));
    driver = new LocalDriver({ driver: "local", root: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should write and read a file", async () => {
    const content = Buffer.from("hello world");
    await driver.put("test.txt", content);

    const result = await driver.get("test.txt");
    expect(result.toString()).toBe("hello world");
  });

  it("should create nested directories", async () => {
    const content = Buffer.from("nested");
    await driver.put("a/b/c/file.txt", content);

    const result = await driver.get("a/b/c/file.txt");
    expect(result.toString()).toBe("nested");
  });

  it("should check file existence", async () => {
    expect(await driver.exists("missing.txt")).toBe(false);

    await driver.put("exists.txt", Buffer.from("yes"));
    expect(await driver.exists("exists.txt")).toBe(true);
  });

  it("should delete a file", async () => {
    await driver.put("to-delete.txt", Buffer.from("bye"));
    expect(await driver.exists("to-delete.txt")).toBe(true);

    await driver.delete("to-delete.txt");
    expect(await driver.exists("to-delete.txt")).toBe(false);
  });

  it("should not throw when deleting non-existent file", async () => {
    await expect(driver.delete("nonexistent.txt")).resolves.not.toThrow();
  });

  it("should delete a directory recursively", async () => {
    await driver.put("dir/a.txt", Buffer.from("a"));
    await driver.put("dir/sub/b.txt", Buffer.from("b"));

    await driver.deleteDirectory("dir");
    expect(await driver.exists("dir/a.txt")).toBe(false);
    expect(await driver.exists("dir/sub/b.txt")).toBe(false);
  });

  it("should copy a file", async () => {
    await driver.put("original.txt", Buffer.from("original"));
    await driver.copy("original.txt", "copy.txt");

    const result = await driver.get("copy.txt");
    expect(result.toString()).toBe("original");
    expect(await driver.exists("original.txt")).toBe(true);
  });

  it("should move a file", async () => {
    await driver.put("source.txt", Buffer.from("moving"));
    await driver.move("source.txt", "dest.txt");

    const result = await driver.get("dest.txt");
    expect(result.toString()).toBe("moving");
    expect(await driver.exists("source.txt")).toBe(false);
  });

  it("should get file size", async () => {
    const content = Buffer.from("12345");
    await driver.put("sized.txt", content);

    const size = await driver.size("sized.txt");
    expect(size).toBe(5);
  });

  it("should detect mime type", async () => {
    const mime = await driver.mimeType("photo.jpg");
    expect(mime).toBe("image/jpeg");
  });

  it("should generate URL with urlBase", () => {
    const d = new LocalDriver({ driver: "local", root: tmpDir, urlBase: "/media" });
    expect(d.url("uploads/photo.jpg")).toBe("/media/uploads/photo.jpg");
  });

  it("should generate URL without urlBase", () => {
    expect(driver.url("uploads/photo.jpg")).toBe("/uploads/photo.jpg");
  });

  it("should throw on temporaryUrl", async () => {
    await expect(
      driver.temporaryUrl("file.txt", new Date()),
    ).rejects.toThrow("Temporary URLs are not supported");
  });

  it("should write and read streams", async () => {
    const { Readable } = await import("stream");
    const readable = Readable.from(Buffer.from("stream content"));
    await driver.putStream("streamed.txt", readable);

    const result = await driver.get("streamed.txt");
    expect(result.toString()).toBe("stream content");

    const readStream = driver.getStream("streamed.txt");
    const chunks: Buffer[] = [];
    for await (const chunk of readStream as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    expect(Buffer.concat(chunks).toString()).toBe("stream content");
  });
});
