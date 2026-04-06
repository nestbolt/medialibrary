import type { PathGenerator } from "../interfaces/path-generator.interface";
import type { MediaEntity } from "../entities/media.entity";

export class DefaultPathGenerator implements PathGenerator {
  getPath(media: MediaEntity): string {
    return `${media.id}/`;
  }

  getPathForConversions(media: MediaEntity): string {
    return `${media.id}/conversions/`;
  }

  getPathForResponsiveImages(media: MediaEntity): string {
    return `${media.id}/responsive-images/`;
  }
}
