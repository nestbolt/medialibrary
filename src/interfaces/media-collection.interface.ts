import type { ConversionBuilder } from "../conversion-builder";

export interface FileInfo {
  mimeType: string;
  size: number;
  fileName: string;
}

export interface MediaCollectionConfig {
  name: string;
  diskName?: string;
  conversionsDiskName?: string;
  acceptsMimeTypes?: string[];
  acceptsFile?: (file: FileInfo) => boolean;
  maxFileSize?: number;
  singleFile?: boolean;
  collectionSizeLimit?: number;
  fallbackUrls: Record<string, string>;
  fallbackPaths: Record<string, string>;
  generateConversions?: (addConversion: (name: string) => ConversionBuilder) => void;
}
