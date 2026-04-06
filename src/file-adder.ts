import type { MediaEntity } from "./entities/media.entity";

export type FileSource =
  | { type: "path"; path: string }
  | { type: "buffer"; buffer: Buffer; fileName: string }
  | { type: "stream"; stream: NodeJS.ReadableStream; fileName: string };

export interface FileAdderAttacher {
  attachMedia(fileAdder: FileAdder): Promise<MediaEntity>;
}

export class FileAdder {
  private _modelType?: string;
  private _modelId?: string;
  private _mediaName?: string;
  private _fileName?: string;
  private _diskName?: string;
  private _conversionsDiskName?: string;
  private _collectionName: string = "default";
  private _customProperties: Record<string, any> = {};
  private _manipulations: Record<string, any> = {};
  private _order?: number;
  private _preserveOriginal: boolean = false;
  private _fileNameSanitizer?: (name: string) => string;

  constructor(
    private readonly attacher: FileAdderAttacher,
    private readonly _source: FileSource,
  ) {}

  get source(): FileSource {
    return this._source;
  }

  get modelType(): string | undefined {
    return this._modelType;
  }

  get modelId(): string | undefined {
    return this._modelId;
  }

  get mediaName(): string | undefined {
    return this._mediaName;
  }

  get fileName(): string | undefined {
    return this._fileName;
  }

  get diskName(): string | undefined {
    return this._diskName;
  }

  get conversionsDiskName(): string | undefined {
    return this._conversionsDiskName;
  }

  get collectionName(): string {
    return this._collectionName;
  }

  get customProperties(): Record<string, any> {
    return this._customProperties;
  }

  get manipulations(): Record<string, any> {
    return this._manipulations;
  }

  get order(): number | undefined {
    return this._order;
  }

  get preserveOriginal(): boolean {
    return this._preserveOriginal;
  }

  get fileNameSanitizer(): ((name: string) => string) | undefined {
    return this._fileNameSanitizer;
  }

  forModel(modelType: string, modelId: string): this {
    this._modelType = modelType;
    this._modelId = modelId;
    return this;
  }

  usingName(name: string): this {
    this._mediaName = name;
    return this;
  }

  usingFileName(fileName: string): this {
    this._fileName = fileName;
    return this;
  }

  toDisk(diskName: string): this {
    this._diskName = diskName;
    return this;
  }

  storingConversionsOnDisk(diskName: string): this {
    this._conversionsDiskName = diskName;
    return this;
  }

  withCustomProperties(properties: Record<string, any>): this {
    this._customProperties = { ...this._customProperties, ...properties };
    return this;
  }

  withManipulations(manipulations: Record<string, any>): this {
    this._manipulations = { ...this._manipulations, ...manipulations };
    return this;
  }

  setOrder(order: number): this {
    this._order = order;
    return this;
  }

  preservingOriginal(preserve: boolean = true): this {
    this._preserveOriginal = preserve;
    return this;
  }

  sanitizingFileName(sanitizer: (name: string) => string): this {
    this._fileNameSanitizer = sanitizer;
    return this;
  }

  async toMediaCollection(collectionName?: string, diskName?: string): Promise<MediaEntity> {
    if (collectionName) {
      this._collectionName = collectionName;
    }
    if (diskName) {
      this._diskName = diskName;
    }
    return this.attacher.attachMedia(this);
  }
}
