import { Readable } from "stream";
import type { StorageDriver } from "../../interfaces/storage-driver.interface";
import type { S3DiskConfig } from "../storage.types";

export class S3Driver implements StorageDriver {
  private client: any;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(private readonly config: S3DiskConfig) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ? config.prefix.replace(/\/$/, "") + "/" : "";
  }

  private getClient(): any {
    if (this.client) return this.client;

    if (this.config.client) {
      this.client = this.config.client;
      return this.client;
    }

    let S3Client: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      S3Client = require("@aws-sdk/client-s3").S3Client;
    } catch {
      throw new Error(
        "@aws-sdk/client-s3 is required for S3 storage. Install it: pnpm add @aws-sdk/client-s3",
      );
    }

    this.client = new S3Client({
      region: this.config.region,
      ...(this.config.credentials ? { credentials: this.config.credentials } : {}),
      ...(this.config.endpoint ? { endpoint: this.config.endpoint } : {}),
      ...(this.config.forcePathStyle ? { forcePathStyle: this.config.forcePathStyle } : {}),
    });

    return this.client;
  }

  private key(path: string): string {
    return `${this.prefix}${path}`;
  }

  private getCommand(name: string): any {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const s3 = require("@aws-sdk/client-s3");
    return s3[name];
  }

  async put(path: string, data: Buffer): Promise<void> {
    const PutObjectCommand = this.getCommand("PutObjectCommand");
    await this.getClient().send(
      new PutObjectCommand({ Bucket: this.bucket, Key: this.key(path), Body: data }),
    );
  }

  async putStream(path: string, stream: NodeJS.ReadableStream): Promise<void> {
    const PutObjectCommand = this.getCommand("PutObjectCommand");
    await this.getClient().send(
      new PutObjectCommand({ Bucket: this.bucket, Key: this.key(path), Body: stream }),
    );
  }

  async get(path: string): Promise<Buffer> {
    const GetObjectCommand = this.getCommand("GetObjectCommand");
    const response = await this.getClient().send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.key(path) }),
    );
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  getStream(path: string): NodeJS.ReadableStream {
    const readable = new Readable({ read() {} });

    const GetObjectCommand = this.getCommand("GetObjectCommand");
    this.getClient()
      .send(new GetObjectCommand({ Bucket: this.bucket, Key: this.key(path) }))
      .then((response: any) => {
        const body = response.Body as NodeJS.ReadableStream;
        body.on("data", (chunk: any) => readable.push(chunk));
        body.on("end", () => readable.push(null));
        body.on("error", (err: Error) => readable.destroy(err));
      })
      .catch((err: Error) => readable.destroy(err));

    return readable;
  }

  async delete(path: string): Promise<void> {
    const DeleteObjectCommand = this.getCommand("DeleteObjectCommand");
    await this.getClient().send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: this.key(path) }),
    );
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    const ListObjectsV2Command = this.getCommand("ListObjectsV2Command");
    const DeleteObjectsCommand = this.getCommand("DeleteObjectsCommand");
    const prefix = this.key(dirPath.endsWith("/") ? dirPath : dirPath + "/");

    let continuationToken: string | undefined;
    do {
      const listResponse = await this.getClient().send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      const objects = listResponse.Contents;
      if (objects && objects.length > 0) {
        await this.getClient().send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: objects.map((o: any) => ({ Key: o.Key })) },
          }),
        );
      }

      continuationToken = listResponse.IsTruncated ? listResponse.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  async exists(path: string): Promise<boolean> {
    const HeadObjectCommand = this.getCommand("HeadObjectCommand");
    try {
      await this.getClient().send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.key(path) }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async copy(source: string, destination: string): Promise<void> {
    const CopyObjectCommand = this.getCommand("CopyObjectCommand");
    await this.getClient().send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${this.key(source)}`,
        Key: this.key(destination),
      }),
    );
  }

  async move(source: string, destination: string): Promise<void> {
    await this.copy(source, destination);
    await this.delete(source);
  }

  async size(path: string): Promise<number> {
    const HeadObjectCommand = this.getCommand("HeadObjectCommand");
    const response = await this.getClient().send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: this.key(path) }),
    );
    return response.ContentLength ?? 0;
  }

  async mimeType(path: string): Promise<string> {
    const HeadObjectCommand = this.getCommand("HeadObjectCommand");
    const response = await this.getClient().send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: this.key(path) }),
    );
    return response.ContentType ?? "application/octet-stream";
  }

  url(path: string): string {
    const endpoint = this.config.endpoint;
    if (endpoint) {
      return `${endpoint}/${this.bucket}/${this.key(path)}`;
    }
    return `https://${this.bucket}.s3.${this.config.region ?? "us-east-1"}.amazonaws.com/${this.key(path)}`;
  }

  async temporaryUrl(
    path: string,
    expiration: Date,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options?: Record<string, any>,
  ): Promise<string> {
    let getSignedUrl: any;
    let GetObjectCommand: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      getSignedUrl = require("@aws-sdk/s3-request-presigner").getSignedUrl;
      GetObjectCommand = this.getCommand("GetObjectCommand");
    } catch {
      throw new Error(
        "@aws-sdk/s3-request-presigner is required for temporary URLs. Install it: pnpm add @aws-sdk/s3-request-presigner",
      );
    }

    const expiresIn = Math.max(1, Math.floor((expiration.getTime() - Date.now()) / 1000));
    return getSignedUrl(
      this.getClient(),
      new GetObjectCommand({ Bucket: this.bucket, Key: this.key(path) }),
      { expiresIn },
    );
  }
}
