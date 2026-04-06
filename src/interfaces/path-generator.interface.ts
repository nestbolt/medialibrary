import type { MediaEntity } from "../entities/media.entity";

export interface PathGenerator {
  getPath(media: MediaEntity): string;
  getPathForConversions(media: MediaEntity): string;
  getPathForResponsiveImages(media: MediaEntity): string;
}
