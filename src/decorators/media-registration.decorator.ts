import "reflect-metadata";
import {
  HAS_MEDIA_METADATA_KEY,
  MEDIA_COLLECTIONS_METADATA_KEY,
  MEDIA_CONVERSIONS_METADATA_KEY,
} from "../media.constants";
import { ConversionBuilder } from "../conversion-builder";
import { MediaCollectionBuilder } from "../media-collection-builder";
import type { ConversionConfig } from "../interfaces/conversion.interface";
import type { MediaCollectionConfig } from "../interfaces/media-collection.interface";

export function RegisterMediaCollections(
  registrar: (addCollection: (name: string) => MediaCollectionBuilder) => void,
): ClassDecorator {
  return (target: Function) => {
    const meta = Reflect.getMetadata(HAS_MEDIA_METADATA_KEY, target);
    const modelType = meta?.modelType ?? target.name;

    const factory = (): MediaCollectionConfig[] => {
      const configs: MediaCollectionConfig[] = [];
      registrar((name: string) => {
        const builder = new MediaCollectionBuilder(name);
        configs.push(builder as any);
        return builder;
      });
      return configs.map((c) => (c instanceof MediaCollectionBuilder ? (c as any).build() : c));
    };

    Reflect.defineMetadata(MEDIA_COLLECTIONS_METADATA_KEY, factory, target);

    if (!(globalThis as any).__nestbolt_media_collections) {
      (globalThis as any).__nestbolt_media_collections = new Map<
        string,
        () => MediaCollectionConfig[]
      >();
    }
    (globalThis as any).__nestbolt_media_collections.set(modelType, factory);
  };
}

export function RegisterMediaConversions(
  registrar: (addConversion: (name: string) => ConversionBuilder) => void,
): ClassDecorator {
  return (target: Function) => {
    const meta = Reflect.getMetadata(HAS_MEDIA_METADATA_KEY, target);
    const modelType = meta?.modelType ?? target.name;

    const factory = (): ConversionConfig[] => {
      const configs: ConversionConfig[] = [];
      registrar((name: string) => {
        const builder = new ConversionBuilder(name);
        configs.push(builder as any);
        return builder;
      });
      return configs.map((c) => (c instanceof ConversionBuilder ? (c as any).build() : c));
    };

    Reflect.defineMetadata(MEDIA_CONVERSIONS_METADATA_KEY, factory, target);

    if (!(globalThis as any).__nestbolt_media_conversions) {
      (globalThis as any).__nestbolt_media_conversions = new Map<
        string,
        () => ConversionConfig[]
      >();
    }
    (globalThis as any).__nestbolt_media_conversions.set(modelType, factory);
  };
}
