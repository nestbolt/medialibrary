import { describe, it, expect, vi } from "vitest";
import { FileAdder } from "../src/file-adder";
import type { FileAdderAttacher } from "../src/file-adder";
import { MediaEntity } from "../src/entities/media.entity";

describe("FileAdder", () => {
  const mockAttacher: FileAdderAttacher = {
    attachMedia: vi.fn().mockResolvedValue(new MediaEntity()),
  };

  it("should create FileAdder with path source", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/photo.jpg" });
    expect(adder.source.type).toBe("path");
  });

  it("should create FileAdder with buffer source", () => {
    const buf = Buffer.from("test");
    const adder = new FileAdder(mockAttacher, { type: "buffer", buffer: buf, fileName: "test.txt" });
    expect(adder.source.type).toBe("buffer");
  });

  it("should set model info with forModel", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .forModel("Post", "123");

    expect(adder.modelType).toBe("Post");
    expect(adder.modelId).toBe("123");
  });

  it("should set custom name", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .usingName("My Photo");

    expect(adder.mediaName).toBe("My Photo");
  });

  it("should set custom file name", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .usingFileName("custom-name.jpg");

    expect(adder.fileName).toBe("custom-name.jpg");
  });

  it("should set disk", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .toDisk("s3");

    expect(adder.diskName).toBe("s3");
  });

  it("should set custom properties", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .withCustomProperties({ alt: "photo", credit: "John" });

    expect(adder.customProperties).toEqual({ alt: "photo", credit: "John" });
  });

  it("should merge custom properties", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .withCustomProperties({ alt: "photo" })
      .withCustomProperties({ credit: "John" });

    expect(adder.customProperties).toEqual({ alt: "photo", credit: "John" });
  });

  it("should set order", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .setOrder(5);

    expect(adder.order).toBe(5);
  });

  it("should set preserve original", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .preservingOriginal();

    expect(adder.preserveOriginal).toBe(true);
  });

  it("should call attacher.attachMedia on toMediaCollection", async () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .forModel("Post", "1");

    await adder.toMediaCollection("images");

    expect(adder.collectionName).toBe("images");
    expect(mockAttacher.attachMedia).toHaveBeenCalledWith(adder);
  });

  it("should override disk on toMediaCollection", async () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" })
      .forModel("Post", "1");

    await adder.toMediaCollection("docs", "s3");

    expect(adder.collectionName).toBe("docs");
    expect(adder.diskName).toBe("s3");
  });

  it("should chain all methods fluently", () => {
    const adder = new FileAdder(mockAttacher, { type: "path", path: "/tmp/file.txt" });
    const result = adder
      .forModel("Post", "1")
      .usingName("Test")
      .usingFileName("test.jpg")
      .toDisk("local")
      .withCustomProperties({ key: "value" })
      .setOrder(1)
      .preservingOriginal()
      .sanitizingFileName((name) => name.toLowerCase());

    expect(result).toBe(adder);
  });
});
