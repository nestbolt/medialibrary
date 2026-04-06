import "reflect-metadata";
import { HAS_MEDIA_METADATA_KEY } from "../media.constants";
import { MediaService } from "../media.service";
import { MediaEntity } from "../entities/media.entity";
import { FileAdder } from "../file-adder";

type Constructor<T = object> = new (...args: any[]) => T;

export interface HasMediaEntity {
  getMediaModelType(): string;
  getMediaModelId(): string | number;
  addMedia(filePathOrBuffer: string | Buffer, fileName?: string): FileAdder;
  getMedia(collectionName?: string): Promise<MediaEntity[]>;
  getFirstMedia(collectionName?: string): Promise<MediaEntity | null>;
  getFirstMediaUrl(collectionName?: string, conversionName?: string): Promise<string>;
  hasMedia(collectionName?: string): Promise<boolean>;
  clearMediaCollection(collectionName?: string): Promise<void>;
  deleteAllMedia(): Promise<void>;
}

export function HasMediaMixin<TBase extends Constructor>(Base: TBase) {
  class HasMediaEntityClass extends Base implements HasMediaEntity {
    getMediaModelType(): string {
      const meta = Reflect.getMetadata(HAS_MEDIA_METADATA_KEY, this.constructor);
      return meta?.modelType ?? this.constructor.name;
    }

    getMediaModelId(): string | number {
      return (this as any).id;
    }

    addMedia(filePathOrBuffer: string | Buffer, fileName?: string): FileAdder {
      const service = MediaService.getInstance();
      if (!service) {
        throw new Error(
          "MediaModule has not been initialized. Make sure MediaModule.forRoot() is imported.",
        );
      }
      const modelType = this.getMediaModelType();
      const modelId = String(this.getMediaModelId());

      if (typeof filePathOrBuffer === "string") {
        return service.addMedia(filePathOrBuffer).forModel(modelType, modelId);
      }
      return service
        .addMediaFromBuffer(filePathOrBuffer, fileName ?? "file")
        .forModel(modelType, modelId);
    }

    async getMedia(collectionName?: string): Promise<MediaEntity[]> {
      const service = MediaService.getInstance();
      if (!service) {
        throw new Error(
          "MediaModule has not been initialized. Make sure MediaModule.forRoot() is imported.",
        );
      }
      return service.getMedia(
        this.getMediaModelType(),
        String(this.getMediaModelId()),
        collectionName,
      );
    }

    async getFirstMedia(collectionName?: string): Promise<MediaEntity | null> {
      const service = MediaService.getInstance();
      if (!service) {
        throw new Error(
          "MediaModule has not been initialized. Make sure MediaModule.forRoot() is imported.",
        );
      }
      return service.getFirstMedia(
        this.getMediaModelType(),
        String(this.getMediaModelId()),
        collectionName,
      );
    }

    async getFirstMediaUrl(
      collectionName?: string,
      conversionName?: string,
    ): Promise<string> {
      const service = MediaService.getInstance();
      if (!service) {
        throw new Error(
          "MediaModule has not been initialized. Make sure MediaModule.forRoot() is imported.",
        );
      }
      const media = await service.getFirstMedia(
        this.getMediaModelType(),
        String(this.getMediaModelId()),
        collectionName,
      );
      if (!media) return "";
      return service.getUrl(media, conversionName);
    }

    async hasMedia(collectionName?: string): Promise<boolean> {
      const service = MediaService.getInstance();
      if (!service) {
        throw new Error(
          "MediaModule has not been initialized. Make sure MediaModule.forRoot() is imported.",
        );
      }
      return service.hasMedia(
        this.getMediaModelType(),
        String(this.getMediaModelId()),
        collectionName,
      );
    }

    async clearMediaCollection(collectionName?: string): Promise<void> {
      const service = MediaService.getInstance();
      if (!service) {
        throw new Error(
          "MediaModule has not been initialized. Make sure MediaModule.forRoot() is imported.",
        );
      }
      await service.clearMediaCollection(
        this.getMediaModelType(),
        String(this.getMediaModelId()),
        collectionName,
      );
    }

    async deleteAllMedia(): Promise<void> {
      const service = MediaService.getInstance();
      if (!service) {
        throw new Error(
          "MediaModule has not been initialized. Make sure MediaModule.forRoot() is imported.",
        );
      }
      await service.deleteAllMedia(
        this.getMediaModelType(),
        String(this.getMediaModelId()),
      );
    }
  }

  return HasMediaEntityClass;
}
