import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { StorageDriver } from "../../interfaces/storage-driver.interface";
import type { LocalDiskConfig } from "../storage.types";
import { detectMimeType } from "../../helpers";

export class LocalDriver implements StorageDriver {
  private readonly root: string;
  private readonly urlBase: string;

  constructor(config?: LocalDiskConfig) {
    this.root = config?.root ?? process.cwd();
    this.urlBase = config?.urlBase ?? "";
  }

  private resolve(filePath: string): string {
    return path.resolve(this.root, filePath);
  }

  private ensureDirectory(filePath: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
  }

  async put(filePath: string, data: Buffer): Promise<void> {
    const fullPath = this.resolve(filePath);
    this.ensureDirectory(fullPath);
    fs.writeFileSync(fullPath, data);
  }

  async putStream(filePath: string, stream: NodeJS.ReadableStream): Promise<void> {
    const fullPath = this.resolve(filePath);
    this.ensureDirectory(fullPath);
    const writeStream = fs.createWriteStream(fullPath);
    await pipeline(stream as Readable, writeStream);
  }

  async get(filePath: string): Promise<Buffer> {
    return fs.readFileSync(this.resolve(filePath));
  }

  getStream(filePath: string): NodeJS.ReadableStream {
    return fs.createReadStream(this.resolve(filePath));
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolve(filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    const fullPath = this.resolve(dirPath);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }

  async exists(filePath: string): Promise<boolean> {
    return fs.existsSync(this.resolve(filePath));
  }

  async copy(source: string, destination: string): Promise<void> {
    const destPath = this.resolve(destination);
    this.ensureDirectory(destPath);
    fs.copyFileSync(this.resolve(source), destPath);
  }

  async move(source: string, destination: string): Promise<void> {
    const destPath = this.resolve(destination);
    this.ensureDirectory(destPath);
    fs.renameSync(this.resolve(source), destPath);
  }

  async size(filePath: string): Promise<number> {
    const stats = fs.statSync(this.resolve(filePath));
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
    _path: string,
    _expiration: Date,
    _options?: Record<string, any>,
  ): Promise<string> {
    throw new Error("Temporary URLs are not supported by the local storage driver.");
  }
}
