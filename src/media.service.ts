import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as fsp from "fs/promises";
import * as http from "http";
import * as https from "https";
import * as path from "path";
import { EntityManager, Repository } from "typeorm";
import { MediaEntity } from "./entities/media.entity";
import { MEDIA_EVENTS } from "./events";
import {
  FileDoesNotExistException,
  FileIsTooBigException,
  FileUnacceptableException,
} from "./exceptions";
import { FileAdder } from "./file-adder";
import { FileManipulator } from "./file-manipulator";
import {
  sanitizeFileName as defaultSanitize,
  detectMimeType,
  generateUuid,
  getBaseName,
} from "./helpers";
import type { ConversionConfig } from "./interfaces/conversion.interface";
import type { FileNamer } from "./interfaces/file-namer.interface";
import type { MediaCollectionConfig } from "./interfaces/media-collection.interface";
import type { MediaModuleOptions } from "./interfaces/media-options.interface";
import type { PathGenerator } from "./interfaces/path-generator.interface";
import type { UrlGenerator } from "./interfaces/url-generator.interface";
import {
  DEFAULT_COLLECTION_NAME,
  DEFAULT_MAX_FILE_SIZE,
  FILE_NAMER,
  MEDIA_OPTIONS,
  PATH_GENERATOR,
  URL_GENERATOR,
} from "./media.constants";
import { DiskManager } from "./storage/disk-manager";

interface EventEmitterLike {
  emit(event: string, ...args: any[]): boolean;
}

@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
  private static instance: MediaService | null = null;
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @Inject(MEDIA_OPTIONS) private readonly options: MediaModuleOptions,
    @InjectRepository(MediaEntity) private readonly mediaRepo: Repository<MediaEntity>,
    private readonly diskManager: DiskManager,
    private readonly fileManipulator: FileManipulator,
    @Inject(PATH_GENERATOR) private readonly pathGenerator: PathGenerator,
    @Inject(URL_GENERATOR) private readonly urlGenerator: UrlGenerator,
    @Inject(FILE_NAMER) private readonly fileNamer: FileNamer,
    @Optional() @Inject("EventEmitter2") private readonly eventEmitter?: EventEmitterLike,
  ) {}

  onModuleInit(): void {
    MediaService.instance = this;
  }

  onModuleDestroy(): void {
    if (MediaService.instance === this) {
      MediaService.instance = null;
    }
  }

  static getInstance(): MediaService | null {
    return MediaService.instance;
  }

  // --- FileAdder factory ---

  addMedia(filePath: string): FileAdder {
    return new FileAdder(this, { type: "path", path: filePath });
  }

  addMediaFromBuffer(buffer: Buffer, fileName: string): FileAdder {
    return new FileAdder(this, { type: "buffer", buffer, fileName });
  }

  addMediaFromStream(stream: NodeJS.ReadableStream, fileName: string): FileAdder {
    return new FileAdder(this, { type: "stream", stream, fileName });
  }

  async addMediaFromUrl(url: string): Promise<FileAdder> {
    const { buffer, fileName } = await this.downloadFile(url);
    return new FileAdder(this, { type: "buffer", buffer, fileName });
  }

  addMediaFromBase64(base64String: string, fileName: string): FileAdder {
    const cleaned = base64String.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleaned, "base64");
    return new FileAdder(this, { type: "buffer", buffer, fileName });
  }

  // --- Retrieval ---

  async getMedia(
    modelType: string,
    modelId: string,
    collectionName?: string,
  ): Promise<MediaEntity[]> {
    const where: Record<string, any> = { modelType, modelId };
    if (collectionName) {
      where.collectionName = collectionName;
    }
    return this.mediaRepo.find({
      where,
      order: { orderColumn: "ASC", createdAt: "ASC" },
    });
  }

  async getFirstMedia(
    modelType: string,
    modelId: string,
    collectionName?: string,
  ): Promise<MediaEntity | null> {
    const where: Record<string, any> = { modelType, modelId };
    if (collectionName) {
      where.collectionName = collectionName;
    }
    return this.mediaRepo.findOne({
      where,
      order: { orderColumn: "ASC", createdAt: "ASC" },
    });
  }

  async getLastMedia(
    modelType: string,
    modelId: string,
    collectionName?: string,
  ): Promise<MediaEntity | null> {
    const where: Record<string, any> = { modelType, modelId };
    if (collectionName) {
      where.collectionName = collectionName;
    }
    return this.mediaRepo.findOne({
      where,
      order: { orderColumn: "DESC", createdAt: "DESC" },
    });
  }

  async hasMedia(modelType: string, modelId: string, collectionName?: string): Promise<boolean> {
    const where: Record<string, any> = { modelType, modelId };
    if (collectionName) {
      where.collectionName = collectionName;
    }
    const count = await this.mediaRepo.count({ where });
    return count > 0;
  }

  // --- URLs ---

  getUrl(media: MediaEntity, conversionName?: string): string {
    return this.urlGenerator.getUrl(media, conversionName);
  }

  getPath(media: MediaEntity, conversionName?: string): string {
    return this.urlGenerator.getPath(media, conversionName);
  }

  getFallbackUrl(
    modelType: string,
    collectionName: string,
    conversionName?: string,
  ): string | null {
    const config = this.getCollectionConfig(modelType, collectionName);
    if (!config) return null;
    const key = conversionName ?? "*";
    return config.fallbackUrls[key] ?? config.fallbackUrls["*"] ?? null;
  }

  getFallbackPath(
    modelType: string,
    collectionName: string,
    conversionName?: string,
  ): string | null {
    const config = this.getCollectionConfig(modelType, collectionName);
    if (!config) return null;
    const key = conversionName ?? "*";
    return config.fallbackPaths[key] ?? config.fallbackPaths["*"] ?? null;
  }

  async getTemporaryUrl(
    media: MediaEntity,
    expiration: Date,
    conversionName?: string,
    options?: Record<string, any>,
  ): Promise<string> {
    return this.urlGenerator.getTemporaryUrl(media, expiration, conversionName, options);
  }

  // --- Collection management ---

  async clearMediaCollection(
    modelType: string,
    modelId: string,
    collectionName?: string,
  ): Promise<void> {
    const collection = collectionName ?? DEFAULT_COLLECTION_NAME;
    const mediaItems = await this.getMedia(modelType, modelId, collection);

    for (const media of mediaItems) {
      await this.deleteMediaFiles(media);
    }

    await this.mediaRepo.delete({
      modelType,
      modelId,
      collectionName: collection,
    });

    this.emit(MEDIA_EVENTS.COLLECTION_CLEARED, {
      modelType,
      modelId,
      collectionName: collection,
    });
  }

  async deleteAllMedia(modelType: string, modelId: string): Promise<void> {
    const mediaItems = await this.getMedia(modelType, modelId);

    await this.mediaRepo.delete({ modelType, modelId });

    for (const media of mediaItems) {
      await this.deleteMediaFiles(media);
    }
  }

  async deleteMedia(mediaId: string): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!media) return;

    const { modelType, modelId } = media;
    await this.mediaRepo.remove(media);
    await this.deleteMediaFiles(media);

    this.emit(MEDIA_EVENTS.MEDIA_DELETED, {
      media,
      modelType,
      modelId,
    });
  }

  // --- Ordering ---

  async setOrder(mediaIds: string[]): Promise<void> {
    await this.mediaRepo.manager.transaction(async (transactionalManager) => {
      for (let i = 0; i < mediaIds.length; i++) {
        await transactionalManager.update(MediaEntity, mediaIds[i], { orderColumn: i });
      }
    });
  }

  // --- Conversions ---

  async regenerateConversions(media: MediaEntity, conversionNames?: string[]): Promise<void> {
    const conversions = this.getConversionsForEntity(media.modelType);
    const applicableConversions = conversions.filter((c) => {
      if (conversionNames && !conversionNames.includes(c.name)) return false;
      if (c.performOnCollections.length === 0) return true;
      return c.performOnCollections.includes(media.collectionName);
    });

    if (applicableConversions.length === 0) return;

    const originalPath = this.urlGenerator.getPath(media);
    const driver = this.diskManager.disk(media.disk);
    const originalBuffer = await driver.get(originalPath);

    await this.performConversions(media, originalBuffer, applicableConversions);
  }

  // --- Internal: FileAdder attacher ---

  async attachMedia(fileAdder: FileAdder): Promise<MediaEntity> {
    const { buffer, resolvedFileName } = await this.resolveFileSource(fileAdder);

    const sanitizer = fileAdder.fileNameSanitizer ?? defaultSanitize;
    const ext = path.extname(resolvedFileName);
    const sanitized = sanitizer(getBaseName(resolvedFileName)) + ext;

    const mimeType = detectMimeType(sanitized);
    const fileSize = buffer.length;
    const maxFileSize = this.options.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;

    if (fileSize > maxFileSize) {
      throw new FileIsTooBigException(fileSize, maxFileSize);
    }

    if (!fileAdder.modelType || !fileAdder.modelId) {
      throw new Error("FileAdder must have modelType and modelId set via forModel()");
    }
    const modelType = fileAdder.modelType;
    const modelId = fileAdder.modelId;
    const collectionName = fileAdder.collectionName;

    const collectionConfig = this.getCollectionConfig(modelType, collectionName);
    if (collectionConfig) {
      this.validateFileForCollection(collectionConfig, sanitized, mimeType, fileSize);
    }

    const diskName =
      fileAdder.diskName ?? collectionConfig?.diskName ?? this.options.defaultDisk ?? "local";
    const conversionsDiskName =
      fileAdder.conversionsDiskName ?? collectionConfig?.conversionsDiskName;

    return this.mediaRepo.manager.transaction(async (transactionalManager) => {
      if (collectionConfig?.singleFile) {
        await this.clearMediaCollectionInTransaction(
          transactionalManager,
          modelType,
          modelId,
          collectionName,
        );
      } else if (collectionConfig?.collectionSizeLimit) {
        await this.enforceCollectionSizeLimitInTransaction(
          transactionalManager,
          modelType,
          modelId,
          collectionName,
          collectionConfig.collectionSizeLimit,
        );
      }

      const media = transactionalManager.create(MediaEntity, {
        modelType,
        modelId,
        uuid: generateUuid(),
        collectionName,
        name: fileAdder.mediaName ?? getBaseName(sanitized),
        fileName: sanitized,
        mimeType,
        disk: diskName,
        conversionsDisk: conversionsDiskName ?? null,
        size: fileSize,
        manipulations: fileAdder.manipulations,
        customProperties: fileAdder.customProperties,
        generatedConversions: {},
        responsiveImages: {},
        orderColumn: fileAdder.order ?? null,
      });

      const savedMedia = await transactionalManager.save(media);

      const filePath = this.urlGenerator.getPath(savedMedia);
      const driver = this.diskManager.disk(diskName);
      await driver.put(filePath, buffer);

      this.emit(MEDIA_EVENTS.MEDIA_ADDED, {
        media: savedMedia,
        modelType,
        modelId,
      });

      const conversions = this.getApplicableConversions(modelType, collectionName);
      if (conversions.length > 0 && this.fileManipulator.isImage(mimeType)) {
        await this.performConversions(savedMedia, buffer, conversions);
        await transactionalManager.save(savedMedia);
      }

      return savedMedia;
    });
  }

  // --- Private helpers ---

  private async resolveFileSource(
    fileAdder: FileAdder,
  ): Promise<{ buffer: Buffer; resolvedFileName: string }> {
    const source = fileAdder.source;

    switch (source.type) {
      case "path": {
        try {
          await fsp.access(source.path);
        } catch {
          throw new FileDoesNotExistException(source.path);
        }
        const buffer = await fsp.readFile(source.path);
        const resolvedFileName = fileAdder.fileName ?? path.basename(source.path);
        return { buffer, resolvedFileName };
      }
      case "buffer": {
        const resolvedFileName = fileAdder.fileName ?? source.fileName;
        return { buffer: source.buffer, resolvedFileName };
      }
      case "stream": {
        const chunks: Buffer[] = [];
        for await (const chunk of source.stream as AsyncIterable<Buffer>) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const buffer = Buffer.concat(chunks);
        const resolvedFileName = fileAdder.fileName ?? source.fileName;
        return { buffer, resolvedFileName };
      }
    }
  }

  private validateFileForCollection(
    config: MediaCollectionConfig,
    fileName: string,
    mimeType: string,
    fileSize: number,
  ): void {
    if (config.acceptsMimeTypes && !config.acceptsMimeTypes.includes(mimeType)) {
      throw new FileUnacceptableException(
        fileName,
        config.name,
        `MIME type "${mimeType}" is not accepted. Allowed: ${config.acceptsMimeTypes.join(", ")}`,
      );
    }

    if (config.maxFileSize && fileSize > config.maxFileSize) {
      throw new FileIsTooBigException(fileSize, config.maxFileSize);
    }

    if (config.acceptsFile && !config.acceptsFile({ mimeType, size: fileSize, fileName })) {
      throw new FileUnacceptableException(fileName, config.name);
    }
  }

  private async clearMediaCollectionInTransaction(
    manager: EntityManager,
    modelType: string,
    modelId: string,
    collectionName: string,
  ): Promise<void> {
    const collection = collectionName ?? DEFAULT_COLLECTION_NAME;
    const mediaItems = await manager.find(MediaEntity, {
      where: { modelType, modelId, collectionName: collection },
    });

    for (const media of mediaItems) {
      await this.deleteMediaFiles(media);
    }

    await manager.delete(MediaEntity, {
      modelType,
      modelId,
      collectionName: collection,
    });
  }

  private async enforceCollectionSizeLimitInTransaction(
    manager: EntityManager,
    modelType: string,
    modelId: string,
    collectionName: string,
    limit: number,
  ): Promise<void> {
    const existing = await manager.find(MediaEntity, {
      where: { modelType, modelId, collectionName },
      order: { orderColumn: "ASC", createdAt: "ASC" },
    });
    if (existing.length >= limit) {
      const toRemove = existing.slice(0, existing.length - limit + 1);
      for (const media of toRemove) {
        await this.deleteMediaFiles(media);
        await manager.remove(media);
      }
    }
  }

  private getApplicableConversions(modelType: string, collectionName: string): ConversionConfig[] {
    const conversions = this.getConversionsForEntity(modelType);
    return conversions.filter((c) => {
      if (c.performOnCollections.length === 0) return true;
      return c.performOnCollections.includes(collectionName);
    });
  }

  private async performConversions(
    media: MediaEntity,
    sourceBuffer: Buffer,
    conversions: ConversionConfig[],
  ): Promise<void> {
    const conversionsDisk = media.conversionsDisk ?? media.disk;
    const driver = this.diskManager.disk(conversionsDisk);

    for (const conversion of conversions) {
      this.emit(MEDIA_EVENTS.CONVERSION_WILL_START, {
        media,
        conversionName: conversion.name,
      });

      try {
        const result = await this.fileManipulator.performConversion(
          sourceBuffer,
          conversion,
          media.mimeType || "application/octet-stream",
        );

        const conversionPath = this.pathGenerator.getPathForConversions(media);
        const conversionFileName = `${conversion.name}-${media.fileName}`;

        const ext = result.extension;
        const currentExt = path.extname(conversionFileName).slice(1);
        const finalFileName =
          ext && ext !== currentExt
            ? conversionFileName.replace(/\.[^.]+$/, `.${ext}`)
            : conversionFileName;

        const fullPath = this.getConversionFullPath(conversionPath, finalFileName);
        await driver.put(fullPath, result.buffer);

        media.markConversionAsGenerated(conversion.name);

        this.emit(MEDIA_EVENTS.CONVERSION_COMPLETED, {
          media,
          conversionName: conversion.name,
        });
      } catch (error) {
        this.logger.error(
          `Failed to perform conversion "${conversion.name}" for media ${media.id}: ${error}`,
        );
        this.emit(MEDIA_EVENTS.CONVERSION_FAILED, {
          media,
          conversionName: conversion.name,
          error,
        });
      }
    }
  }

  private getConversionFullPath(conversionPath: string, fileName: string): string {
    const prefix = this.options.prefix ? `${this.options.prefix}/` : "";
    return `${prefix}${conversionPath}${fileName}`;
  }

  private async deleteMediaFiles(media: MediaEntity): Promise<void> {
    try {
      const basePath = this.pathGenerator.getPath(media);
      const prefix = this.options.prefix ? `${this.options.prefix}/` : "";
      const dirPath = `${prefix}${basePath}`;
      const driver = this.diskManager.disk(media.disk);
      await driver.deleteDirectory(dirPath);

      if (media.conversionsDisk && media.conversionsDisk !== media.disk) {
        const conversionDriver = this.diskManager.disk(media.conversionsDisk);
        await conversionDriver.deleteDirectory(dirPath);
      }
    } catch (error) {
      this.logger.warn(`Failed to delete files for media ${media.id}: ${error}`);
    }
  }

  private getCollectionConfig(
    modelType: string,
    collectionName: string,
  ): MediaCollectionConfig | undefined {
    const collections = this.getCollectionsForEntity(modelType);
    return collections.find((c) => c.name === collectionName);
  }

  private getCollectionsForEntity(modelType: string): MediaCollectionConfig[] {
    const registry = (globalThis as any).__nestbolt_media_collections as
      | Map<string, () => MediaCollectionConfig[]>
      | undefined;
    if (!registry) return [];
    const factory = registry.get(modelType);
    return factory ? factory() : [];
  }

  private getConversionsForEntity(modelType: string): ConversionConfig[] {
    const registry = (globalThis as any).__nestbolt_media_conversions as
      | Map<string, () => ConversionConfig[]>
      | undefined;
    if (!registry) return [];
    const factory = registry.get(modelType);
    return factory ? factory() : [];
  }

  private emit(event: string, payload: any): void {
    if (this.eventEmitter) {
      try {
        this.eventEmitter.emit(event, payload);
      } catch (error) {
        this.logger.error(`Failed to emit event "${event}": ${error}`);
      }
    }
  }

  private downloadFile(
    url: string,
    redirectCount = 0,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const MAX_REDIRECTS = 5;
    const TIMEOUT_MS = 30_000;

    return new Promise((resolve, reject) => {
      const lib = url.startsWith("https") ? https : http;
      const request = lib
        .get(url, (response) => {
          const statusCode = response.statusCode ?? 0;

          if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
            if (redirectCount >= MAX_REDIRECTS) {
              reject(
                new Error(`Too many redirects (max ${MAX_REDIRECTS}) when downloading: ${url}`),
              );
              return;
            }
            this.downloadFile(response.headers.location, redirectCount + 1)
              .then(resolve)
              .catch(reject);
            return;
          }

          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`Failed to download file from "${url}": HTTP ${statusCode}`));
            return;
          }

          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => chunks.push(chunk));
          response.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const urlPath = new URL(url).pathname;
            const fileName = path.basename(urlPath) || "downloaded-file";
            resolve({ buffer, fileName });
          });
          response.on("error", reject);
        })
        .on("error", reject);

      request.setTimeout(TIMEOUT_MS, () => {
        request.destroy();
        reject(new Error(`Download timed out after ${TIMEOUT_MS}ms: ${url}`));
      });
    });
  }
}
