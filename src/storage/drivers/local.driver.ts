import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { detectMimeType } from "../../helpers";
import type { StorageDriver } from "../../interfaces/storage-driver.interface";
import type { LocalDiskConfig } from "../storage.types";

export class LocalDriver implements StorageDriver {
  private readonly root: string;
  private readonly urlBase: string;

  constructor(config?: LocalDiskConfig) {
    this.root = config?.root ?? process.cwd();
    this.urlBase = config?.urlBase ?? "";
  }

  private resolve(filePath: string): string {
    const resolved = path.resolve(this.root, filePath);
    if (!resolved.startsWith(this.root)) {
      throw new Error(
        `Path traversal detected: "${filePath}" resolves outside the root directory.`,
      );
    }
    return resolved;
  }

  private async ensureDirectory(filePath: string): Promise<void> {
    const dir = path.dirname(filePath);
    await fsp.mkdir(dir, { recursive: true });
  }

  async put(filePath: string, data: Buffer): Promise<void> {
    const fullPath = this.resolve(filePath);
    await this.ensureDirectory(fullPath);
    await fsp.writeFile(fullPath, data);
  }

  async putStream(filePath: string, stream: NodeJS.ReadableStream): Promise<void> {
    const fullPath = this.resolve(filePath);
    await this.ensureDirectory(fullPath);
    const writeStream = fs.createWriteStream(fullPath);
    await pipeline(stream as Readable, writeStream);
  }

  async get(filePath: string): Promise<Buffer> {
    return fsp.readFile(this.resolve(filePath));
  }

  getStream(filePath: string): NodeJS.ReadableStream {
    return fs.createReadStream(this.resolve(filePath));
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolve(filePath);
    try {
      await fsp.unlink(fullPath);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolve(dirPath);
    try {
      await fsp.rm(fullPath, { recursive: true, force: true });
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fsp.access(this.resolve(filePath));
      return true;
    } catch {
      return false;
    }
  }

  async copy(source: string, destination: string): Promise<void> {
    const destPath = this.resolve(destination);
    await this.ensureDirectory(destPath);
    await fsp.copyFile(this.resolve(source), destPath);
  }

  async move(source: string, destination: string): Promise<void> {
    const destPath = this.resolve(destination);
    await this.ensureDirectory(destPath);
    await fsp.rename(this.resolve(source), destPath);
  }

  async size(filePath: string): Promise<number> {
    const stats = await fsp.stat(this.resolve(filePath));
    return stats.size;
  }

  async mimeType(filePath: string): Promise<string> {
    return detectMimeType(filePath);
  }

  url(filePath: string): string {
    if (!this.urlBase) {
      return `/${filePath}`;
    }
    const base = this.urlBase.endsWith("/") ? this.urlBase.slice(0, -1) : this.urlBase;
    return `${base}/${filePath}`;
  }

  async temporaryUrl(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    path: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    expiration: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: Record<string, any>,
  ): Promise<string> {
    throw new Error("Temporary URLs are not supported by the local storage driver.");
  }
}
