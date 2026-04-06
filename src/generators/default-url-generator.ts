import { Inject, Injectable } from "@nestjs/common";
import type { UrlGenerator } from "../interfaces/url-generator.interface";
import type { PathGenerator } from "../interfaces/path-generator.interface";
import type { MediaModuleOptions } from "../interfaces/media-options.interface";
import type { MediaEntity } from "../entities/media.entity";
import { MEDIA_OPTIONS, PATH_GENERATOR } from "../media.constants";
import { DiskManager } from "../storage/disk-manager";

@Injectable()
export class DefaultUrlGenerator implements UrlGenerator {
  constructor(
    @Inject(MEDIA_OPTIONS) private readonly options: MediaModuleOptions,
    @Inject(PATH_GENERATOR) private readonly pathGenerator: PathGenerator,
    private readonly diskManager: DiskManager,
  ) {}

  getUrl(media: MediaEntity, conversionName?: string): string {
    const filePath = this.getPath(media, conversionName);
    const diskName = conversionName && media.conversionsDisk ? media.conversionsDisk : media.disk;
    const driver = this.diskManager.disk(diskName);

    const baseUrl = this.options.baseUrl;
    if (baseUrl) {
      const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
      return `${base}/${filePath}`;
    }

    return driver.url(filePath);
  }

  getPath(media: MediaEntity, conversionName?: string): string {
    const prefix = this.options.prefix ? `${this.options.prefix}/` : "";

    if (conversionName) {
      const conversionPath = this.pathGenerator.getPathForConversions(media);
      return `${prefix}${conversionPath}${conversionName}-${media.fileName}`;
    }

    const basePath = this.pathGenerator.getPath(media);
    return `${prefix}${basePath}${media.fileName}`;
  }

  async getTemporaryUrl(
    media: MediaEntity,
    expiration: Date,
    conversionName?: string,
    options?: Record<string, any>,
  ): Promise<string> {
    const filePath = this.getPath(media, conversionName);
    const diskName = conversionName && media.conversionsDisk ? media.conversionsDisk : media.disk;
    const driver = this.diskManager.disk(diskName);
    return driver.temporaryUrl(filePath, expiration, options);
  }
}
