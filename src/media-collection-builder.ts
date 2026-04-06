import type { MediaCollectionConfig, FileInfo } from "./interfaces/media-collection.interface";
import type { ConversionBuilder } from "./conversion-builder";

export class MediaCollectionBuilder {
  private readonly _name: string;
  private _diskName?: string;
  private _conversionsDiskName?: string;
  private _acceptsMimeTypes?: string[];
  private _acceptsFile?: (file: FileInfo) => boolean;
  private _maxFileSize?: number;
  private _singleFile: boolean = false;
  private _collectionSizeLimit?: number;
  private _fallbackUrls: Record<string, string> = {};
  private _fallbackPaths: Record<string, string> = {};
  private _generateConversions?: (addConversion: (name: string) => ConversionBuilder) => void;

  constructor(name: string) {
    this._name = name;
  }

  useDisk(diskName: string): this {
    this._diskName = diskName;
    return this;
  }

  storeConversionsOnDisk(diskName: string): this {
    this._conversionsDiskName = diskName;
    return this;
  }

  acceptsMimeTypes(mimeTypes: string[]): this {
    this._acceptsMimeTypes = mimeTypes;
    return this;
  }

  acceptsFile(predicate: (file: FileInfo) => boolean): this {
    this._acceptsFile = predicate;
    return this;
  }

  maxFileSize(bytes: number): this {
    this._maxFileSize = bytes;
    return this;
  }

  singleFile(): this {
    this._singleFile = true;
    return this;
  }

  onlyKeepLatest(max: number): this {
    this._collectionSizeLimit = max;
    return this;
  }

  useFallbackUrl(url: string, conversionName?: string): this {
    this._fallbackUrls[conversionName ?? "*"] = url;
    return this;
  }

  useFallbackPath(path: string, conversionName?: string): this {
    this._fallbackPaths[conversionName ?? "*"] = path;
    return this;
  }

  registerMediaConversions(
    registrar: (addConversion: (name: string) => ConversionBuilder) => void,
  ): this {
    this._generateConversions = registrar;
    return this;
  }

  build(): MediaCollectionConfig {
    return {
      name: this._name,
      diskName: this._diskName,
      conversionsDiskName: this._conversionsDiskName,
      acceptsMimeTypes: this._acceptsMimeTypes,
      acceptsFile: this._acceptsFile,
      maxFileSize: this._maxFileSize,
      singleFile: this._singleFile,
      collectionSizeLimit: this._collectionSizeLimit,
      fallbackUrls: { ...this._fallbackUrls },
      fallbackPaths: { ...this._fallbackPaths },
      generateConversions: this._generateConversions,
    };
  }
}
