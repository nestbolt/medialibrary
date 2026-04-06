import type { MediaEntity } from "../entities/media.entity";

export interface UrlGenerator {
  getUrl(media: MediaEntity, conversionName?: string): string;
  getPath(media: MediaEntity, conversionName?: string): string;
  getTemporaryUrl(
    media: MediaEntity,
    expiration: Date,
    conversionName?: string,
    options?: Record<string, any>,
  ): Promise<string>;
}
