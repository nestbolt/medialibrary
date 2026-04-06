import "reflect-metadata";
import { HAS_MEDIA_METADATA_KEY } from "../media.constants";

export interface HasMediaOptions {
  modelType?: string;
}

export function HasMedia(options?: HasMediaOptions): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(
      HAS_MEDIA_METADATA_KEY,
      { modelType: options?.modelType ?? target.name },
      target,
    );
  };
}
