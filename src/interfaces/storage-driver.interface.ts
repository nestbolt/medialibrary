export interface StorageDriver {
  put(path: string, data: Buffer): Promise<void>;
  putStream(path: string, stream: NodeJS.ReadableStream): Promise<void>;
  get(path: string): Promise<Buffer>;
  getStream(path: string): NodeJS.ReadableStream;
  delete(path: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  copy(source: string, destination: string): Promise<void>;
  move(source: string, destination: string): Promise<void>;
  size(path: string): Promise<number>;
  mimeType(path: string): Promise<string>;
  url(path: string): string;
  temporaryUrl(path: string, expiration: Date, options?: Record<string, any>): Promise<string>;
}
