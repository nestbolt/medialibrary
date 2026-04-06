import "reflect-metadata";
import { ConversionBuilder } from "../conversion-builder";
import type { ConversionConfig } from "../interfaces/conversion.interface";
import type { MediaCollectionConfig } from "../interfaces/media-collection.interface";
import { MediaCollectionBuilder } from "../media-collection-builder";
import {
  HAS_MEDIA_METADATA_KEY,
  MEDIA_COLLECTIONS_METADATA_KEY,
  MEDIA_CONVERSIONS_METADATA_KEY,
} from "../media.constants";

/**
 * Clear all global media registries. Useful in tests to prevent state leakage.
 */
export function clearMediaRegistries(): void {
  const g = globalThis as any;
  if (g.__nestbolt_media_collections) {
    g.__nestbolt_media_collections.clear();
  }
  if (g.__nestbolt_media_conversions) {
    g.__nestbolt_media_conversions.clear();
  }
}

export function RegisterMediaCollections(
  registrar: (addCollection: (name: string) => MediaCollectionBuilder) => void,
): ClassDecorator {
  return (target: Function) => {
    const meta = Reflect.getMetadata(HAS_MEDIA_METADATA_KEY, target);
    const modelType = meta?.modelType ?? target.name;

    const factory = (): MediaCollectionConfig[] => {
      const builders: MediaCollectionBuilder[] = [];
      registrar((name: string) => {
        const builder = new MediaCollectionBuilder(name);
        builders.push(builder);
        return builder;
      });
      return builders.map((b) => (b as any).build());
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
      const builders: ConversionBuilder[] = [];
      registrar((name: string) => {
        const builder = new ConversionBuilder(name);
        builders.push(builder);
        return builder;
      });
      return builders.map((b) => (b as any).build());
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
