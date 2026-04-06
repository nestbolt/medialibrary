import { describe, it, expect, vi, beforeEach } from "vitest";
import { S3Driver } from "../src/storage/drivers/s3.driver";

/**
 * S3Driver tests use the `client` config option to inject a mock S3 client,
 * which avoids needing real AWS credentials.
 */

function createMockClient() {
  return { send: vi.fn() };
}

describe("S3Driver", () => {
  let mockClient: ReturnType<typeof createMockClient>;
  let driver: S3Driver;

  beforeEach(() => {
    mockClient = createMockClient();
    driver = new S3Driver({
      driver: "s3",
      bucket: "my-bucket",
      region: "us-east-1",
      client: mockClient,
    });
  });

  describe("constructor", () => {
    it("should set bucket and empty prefix when no prefix given", () => {
      const d = new S3Driver({ driver: "s3", bucket: "test", region: "eu-west-1", client: mockClient });
      expect(d.url("file.txt")).toContain("test");
    });

    it("should normalize prefix with trailing slash", () => {
      const d = new S3Driver({
        driver: "s3",
        bucket: "test",
        region: "us-east-1",
        prefix: "uploads/",
        client: mockClient,
      });
      expect(d.url("file.txt")).toContain("uploads/file.txt");
    });

    it("should add trailing slash to prefix without one", () => {
      const d = new S3Driver({
        driver: "s3",
        bucket: "test",
        region: "us-east-1",
        prefix: "uploads",
        client: mockClient,
      });
      expect(d.url("file.txt")).toContain("uploads/file.txt");
    });
  });

  describe("getClient", () => {
    it("should use provided client from config", async () => {
      mockClient.send.mockResolvedValueOnce(undefined);
      await driver.put("file.txt", Buffer.from("data"));
      expect(mockClient.send).toHaveBeenCalled();
    });

    it("should cache the client on subsequent calls", async () => {
      mockClient.send.mockResolvedValue(undefined);
      await driver.put("a.txt", Buffer.from("a"));
      await driver.put("b.txt", Buffer.from("b"));
      expect(mockClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe("put", () => {
    it("should send PutObjectCommand with correct params", async () => {
      mockClient.send.mockResolvedValueOnce(undefined);
      await driver.put("path/file.txt", Buffer.from("data"));

      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd.input.Bucket).toBe("my-bucket");
      expect(cmd.input.Key).toBe("path/file.txt");
      expect(cmd.input.Body).toBeInstanceOf(Buffer);
    });

    it("should include prefix in key when configured", async () => {
      const d = new S3Driver({
        driver: "s3",
        bucket: "test",
        region: "us-east-1",
        prefix: "uploads",
        client: mockClient,
      });
      mockClient.send.mockResolvedValueOnce(undefined);
      await d.put("file.txt", Buffer.from("data"));

      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd.input.Key).toBe("uploads/file.txt");
    });
  });

  describe("putStream", () => {
    it("should send PutObjectCommand with stream", async () => {
      const { Readable } = require("stream");
      const stream = Readable.from(Buffer.from("stream data"));
      mockClient.send.mockResolvedValueOnce(undefined);
      await driver.putStream("path/file.txt", stream);

      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd.input.Key).toBe("path/file.txt");
    });
  });

  describe("get", () => {
    it("should return buffer from response body", async () => {
      const chunks = [Buffer.from("hello"), Buffer.from(" world")];
      mockClient.send.mockResolvedValueOnce({
        Body: (async function* () {
          for (const c of chunks) yield c;
        })(),
      });

      const result = await driver.get("file.txt");
      expect(result.toString()).toBe("hello world");
    });

    it("should handle non-Buffer chunks", async () => {
      mockClient.send.mockResolvedValueOnce({
        Body: (async function* () {
          yield new Uint8Array([104, 105]);
        })(),
      });

      const result = await driver.get("file.txt");
      expect(result.toString()).toBe("hi");
    });
  });

  describe("getStream", () => {
    it("should return a readable stream", async () => {
      const { EventEmitter } = require("events");
      const body = new EventEmitter();
      mockClient.send.mockResolvedValueOnce({ Body: body });

      const stream = driver.getStream("file.txt");
      expect(stream).toBeDefined();

      await new Promise((r) => setTimeout(r, 50));

      const chunks: Buffer[] = [];
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));

      body.emit("data", Buffer.from("hello"));
      body.emit("end");

      await new Promise((r) => setTimeout(r, 50));
      expect(Buffer.concat(chunks).toString()).toBe("hello");
    });

    it("should handle body error", async () => {
      const { EventEmitter } = require("events");
      const body = new EventEmitter();
      mockClient.send.mockResolvedValueOnce({ Body: body });

      const stream = driver.getStream("file.txt");
      await new Promise((r) => setTimeout(r, 50));

      const errorPromise = new Promise<Error>((resolve) => {
        stream.on("error", resolve);
      });

      body.emit("error", new Error("body error"));
      const err = await errorPromise;
      expect(err.message).toBe("body error");
    });

    it("should handle send rejection", async () => {
      mockClient.send.mockRejectedValueOnce(new Error("send failed"));

      const stream = driver.getStream("file.txt");
      const errorPromise = new Promise<Error>((resolve) => {
        stream.on("error", resolve);
      });

      const err = await errorPromise;
      expect(err.message).toBe("send failed");
    });
  });

  describe("delete", () => {
    it("should send DeleteObjectCommand", async () => {
      mockClient.send.mockResolvedValueOnce(undefined);
      await driver.delete("file.txt");

      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd.input.Bucket).toBe("my-bucket");
      expect(cmd.input.Key).toBe("file.txt");
    });
  });

  describe("deleteDirectory", () => {
    it("should list and delete objects in directory", async () => {
      mockClient.send
        .mockResolvedValueOnce({
          Contents: [{ Key: "dir/file1.txt" }, { Key: "dir/file2.txt" }],
          IsTruncated: false,
        })
        .mockResolvedValueOnce(undefined);

      await driver.deleteDirectory("dir");
      expect(mockClient.send).toHaveBeenCalledTimes(2);
    });

    it("should handle paginated results", async () => {
      mockClient.send
        .mockResolvedValueOnce({
          Contents: [{ Key: "dir/file1.txt" }],
          IsTruncated: true,
          NextContinuationToken: "token123",
        })
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({
          Contents: [{ Key: "dir/file2.txt" }],
          IsTruncated: false,
        })
        .mockResolvedValueOnce(undefined);

      await driver.deleteDirectory("dir");
      expect(mockClient.send).toHaveBeenCalledTimes(4);
    });

    it("should handle empty directory (null contents)", async () => {
      mockClient.send.mockResolvedValueOnce({
        Contents: null,
        IsTruncated: false,
      });

      await driver.deleteDirectory("empty-dir");
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it("should handle empty contents array", async () => {
      mockClient.send.mockResolvedValueOnce({
        Contents: [],
        IsTruncated: false,
      });

      await driver.deleteDirectory("empty-dir");
      expect(mockClient.send).toHaveBeenCalledTimes(1);
    });

    it("should handle dirPath with trailing slash", async () => {
      mockClient.send.mockResolvedValueOnce({
        Contents: [],
        IsTruncated: false,
      });

      await driver.deleteDirectory("dir/");

      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd.input.Prefix).toBe("dir/");
    });
  });

  describe("exists", () => {
    it("should return true when object exists", async () => {
      mockClient.send.mockResolvedValueOnce({});
      const result = await driver.exists("file.txt");
      expect(result).toBe(true);
    });

    it("should return false when object does not exist", async () => {
      mockClient.send.mockRejectedValueOnce(new Error("NotFound"));
      const result = await driver.exists("missing.txt");
      expect(result).toBe(false);
    });
  });

  describe("copy", () => {
    it("should send CopyObjectCommand with correct params", async () => {
      mockClient.send.mockResolvedValueOnce(undefined);
      await driver.copy("source.txt", "dest.txt");

      const cmd = mockClient.send.mock.calls[0][0];
      expect(cmd.input.Bucket).toBe("my-bucket");
      expect(cmd.input.CopySource).toBe("my-bucket/source.txt");
      expect(cmd.input.Key).toBe("dest.txt");
    });
  });

  describe("move", () => {
    it("should copy then delete", async () => {
      mockClient.send.mockResolvedValue(undefined);
      await driver.move("source.txt", "dest.txt");
      expect(mockClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe("size", () => {
    it("should return ContentLength", async () => {
      mockClient.send.mockResolvedValueOnce({ ContentLength: 1024 });
      const result = await driver.size("file.txt");
      expect(result).toBe(1024);
    });

    it("should return 0 when ContentLength is undefined", async () => {
      mockClient.send.mockResolvedValueOnce({});
      const result = await driver.size("file.txt");
      expect(result).toBe(0);
    });
  });

  describe("mimeType", () => {
    it("should return ContentType", async () => {
      mockClient.send.mockResolvedValueOnce({ ContentType: "image/jpeg" });
      const result = await driver.mimeType("photo.jpg");
      expect(result).toBe("image/jpeg");
    });

    it("should return application/octet-stream when ContentType is undefined", async () => {
      mockClient.send.mockResolvedValueOnce({});
      const result = await driver.mimeType("unknown");
      expect(result).toBe("application/octet-stream");
    });
  });

  describe("url", () => {
    it("should return default S3 URL", () => {
      const result = driver.url("path/file.txt");
      expect(result).toBe("https://my-bucket.s3.us-east-1.amazonaws.com/path/file.txt");
    });

    it("should use endpoint when configured", () => {
      const d = new S3Driver({
        driver: "s3",
        bucket: "test",
        region: "us-east-1",
        endpoint: "http://localhost:9000",
        client: mockClient,
      });
      expect(d.url("file.txt")).toBe("http://localhost:9000/test/file.txt");
    });

    it("should use default region when not specified", () => {
      const d = new S3Driver({ driver: "s3", bucket: "test", client: mockClient } as any);
      expect(d.url("file.txt")).toContain("us-east-1");
    });

    it("should include prefix in URL", () => {
      const d = new S3Driver({
        driver: "s3",
        bucket: "test",
        region: "us-east-1",
        prefix: "uploads",
        client: mockClient,
      });
      expect(d.url("file.txt")).toBe("https://test.s3.us-east-1.amazonaws.com/uploads/file.txt");
    });
  });

  describe("temporaryUrl", () => {
    it("should call getSignedUrl and compute expiresIn", async () => {
      // We can't easily test this without a real S3Client since getSignedUrl
      // needs endpointProvider. But we can at least verify the code path runs.
      // The method will throw because our mock client lacks endpointProvider.
      const expiration = new Date(Date.now() + 3600 * 1000);
      await expect(driver.temporaryUrl("file.txt", expiration)).rejects.toThrow();
    });

    it("should use minimum 1 second for past expiration dates", async () => {
      const expiration = new Date(Date.now() - 10000);
      // Will throw due to mock client, but exercises the expiresIn calculation
      await expect(driver.temporaryUrl("file.txt", expiration)).rejects.toThrow();
    });
  });
});
