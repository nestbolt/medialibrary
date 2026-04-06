import { Inject, Injectable, Logger, OnModuleInit, Optional } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as https from "https";
import { Readable } from "stream";
import { MediaEntity } from "./entities/media.entity";
import { DiskManager } from "./storage/disk-manager";
import { FileManipulator } from "./file-manipulator";
import { FileAdder, FileSource } from "./file-adder";
import { ConversionBuilder } from "./conversion-builder";
import { MEDIA_OPTIONS, PATH_GENERATOR, URL_GENERATOR, FILE_NAMER } from "./media.constants";
import {
  MEDIA_COLLECTIONS_METADATA_KEY,
  MEDIA_CONVERSIONS_METADATA_KEY,
  DEFAULT_COLLECTION_NAME,
  DEFAULT_MAX_FILE_SIZE,
} from "./media.constants";
import { MEDIA_EVENTS } from "./events";
import type { MediaModuleOptions } from "./interfaces/media-options.interface";
import type { PathGenerator } from "./interfaces/path-generator.interface";
import type { UrlGenerator } from "./interfaces/url-generator.interface";
import type { FileNamer } from "./interfaces/file-namer.interface";
import type { ConversionConfig } from "./interfaces/conversion.interface";
import type { MediaCollectionConfig } from "./interfaces/media-collection.interface";
import type { MediaCollectionBuilder } from "./media-collection-builder";
import {
  FileDoesNotExistException,
  FileIsTooBigException,
  FileUnacceptableException,
} from "./exceptions";
import {
  detectMimeType,
  generateUuid,
  getBaseName,
  sanitizeFileName as defaultSanitize,
} from "./helpers";

interface EventEmitterLike {
  emit(event: string, ...args: any[]): boolean;
}

@Injectable()
export class MediaService implements OnModuleInit {
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

  async hasMedia(
    modelType: string,
    modelId: string,
    collectionName?: string,
  ): Promise<boolean> {
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

    for (const media of mediaItems) {
      await this.deleteMediaFiles(media);
    }

    await this.mediaRepo.delete({ modelType, modelId });
  }

  async deleteMedia(mediaId: string): Promise<void> {
    const media = await this.mediaRepo.findOne({ where: { id: mediaId } });
    if (!media) return;

    await this.deleteMediaFiles(media);
    await this.mediaRepo.remove(media);

    this.emit(MEDIA_EVENTS.MEDIA_DELETED, {
      media,
      modelType: media.modelType,
      modelId: media.modelId,
    });
  }

  // --- Ordering ---

  async setOrder(mediaIds: string[]): Promise<void> {
    for (let i = 0; i < mediaIds.length; i++) {
      await this.mediaRepo.update(mediaIds[i], { orderColumn: i });
    }
  }

  // --- Conversions ---

  async regenerateConversions(
    media: MediaEntity,
    conversionNames?: string[],
  ): Promise<void> {
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

    const modelType = fileAdder.modelType!;
    const modelId = fileAdder.modelId!;
    const collectionName = fileAdder.collectionName;

    const collectionConfig = this.getCollectionConfig(modelType, collectionName);
    if (collectionConfig) {
      this.validateFileForCollection(collectionConfig, sanitized, mimeType, fileSize);
    }

    if (collectionConfig?.singleFile) {
      await this.clearMediaCollection(modelType, modelId, collectionName);
    } else if (collectionConfig?.collectionSizeLimit) {
      await this.enforceCollectionSizeLimit(
        modelType,
        modelId,
        collectionName,
        collectionConfig.collectionSizeLimit,
      );
    }

    const diskName = fileAdder.diskName ?? collectionConfig?.diskName ?? this.options.defaultDisk ?? "local";
    const conversionsDiskName = fileAdder.conversionsDiskName ?? collectionConfig?.conversionsDiskName;

    const media = this.mediaRepo.create({
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

    const savedMedia = await this.mediaRepo.save(media);

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
      await this.mediaRepo.save(savedMedia);
    }

    return savedMedia;
  }

  // --- Private helpers ---

  private async resolveFileSource(
    fileAdder: FileAdder,
  ): Promise<{ buffer: Buffer; resolvedFileName: string }> {
    const source = fileAdder.source;

    switch (source.type) {
      case "path": {
        if (!fs.existsSync(source.path)) {
          throw new FileDoesNotExistException(source.path);
        }
        const buffer = fs.readFileSync(source.path);
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

  private async enforceCollectionSizeLimit(
    modelType: string,
    modelId: string,
    collectionName: string,
    limit: number,
  ): Promise<void> {
    const existing = await this.getMedia(modelType, modelId, collectionName);
    if (existing.length >= limit) {
      const toRemove = existing.slice(0, existing.length - limit + 1);
      for (const media of toRemove) {
        await this.deleteMedia(media.id);
      }
    }
  }

  private getApplicableConversions(
    modelType: string,
    collectionName: string,
  ): ConversionConfig[] {
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
      this.eventEmitter.emit(event, payload);
    }
  }

  private downloadFile(url: string): Promise<{ buffer: Buffer; fileName: string }> {
    return new Promise((resolve, reject) => {
      const lib = url.startsWith("https") ? https : http;
      lib.get(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          this.downloadFile(response.headers.location).then(resolve).catch(reject);
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
      }).on("error", reject);
    });
  }
}
