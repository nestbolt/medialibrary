import type { Type } from "@nestjs/common";
import type { DiskConfig } from "../storage/storage.types";
import type { PathGenerator } from "./path-generator.interface";
import type { UrlGenerator } from "./url-generator.interface";
import type { FileNamer } from "./file-namer.interface";

export interface MediaModuleOptions {
  defaultDisk?: string;
  disks?: Record<string, DiskConfig>;
  maxFileSize?: number;
  pathGenerator?: Type<PathGenerator>;
  urlGenerator?: Type<UrlGenerator>;
  fileNamer?: Type<FileNamer>;
  baseUrl?: string;
  prefix?: string;
}

export interface MediaAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<MediaModuleOptions> | MediaModuleOptions;
}
