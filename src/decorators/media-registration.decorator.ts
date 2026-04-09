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
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
    const collectionsRegistry = (globalThis as any).__nestbolt_media_collections as Map<
      string,
      () => MediaCollectionConfig[]
    >;
    if (collectionsRegistry.has(modelType)) {
      console.warn(
        `[MediaLibrary] Overwriting existing media collections registration for "${modelType}". ` +
          `Ensure each entity has a unique modelType.`,
      );
    }
    collectionsRegistry.set(modelType, factory);
  };
}

export function RegisterMediaConversions(
  registrar: (addConversion: (name: string) => ConversionBuilder) => void,
): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
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
    const conversionsRegistry = (globalThis as any).__nestbolt_media_conversions as Map<
      string,
      () => ConversionConfig[]
    >;
    if (conversionsRegistry.has(modelType)) {
      console.warn(
        `[MediaLibrary] Overwriting existing media conversions registration for "${modelType}". ` +
          `Ensure each entity has a unique modelType.`,
      );
    }
    conversionsRegistry.set(modelType, factory);
  };
}
