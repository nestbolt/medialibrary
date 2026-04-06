import type { MediaEntity } from "../entities/media.entity";

export const MEDIA_EVENTS = {
  MEDIA_ADDED: "media.added",
  MEDIA_UPDATED: "media.updated",
  MEDIA_DELETED: "media.deleted",
  COLLECTION_CLEARED: "media.collection-cleared",
  CONVERSION_WILL_START: "media.conversion-will-start",
  CONVERSION_COMPLETED: "media.conversion-completed",
  CONVERSION_FAILED: "media.conversion-failed",
} as const;

export interface MediaAddedEvent {
  media: MediaEntity;
  modelType: string;
  modelId: string;
}

export interface MediaUpdatedEvent {
  media: MediaEntity;
  modelType: string;
  modelId: string;
}

export interface MediaDeletedEvent {
  media: MediaEntity;
  modelType: string;
  modelId: string;
}

export interface CollectionClearedEvent {
  modelType: string;
  modelId: string;
  collectionName: string;
}

export interface ConversionWillStartEvent {
  media: MediaEntity;
  conversionName: string;
}

export interface ConversionCompletedEvent {
  media: MediaEntity;
  conversionName: string;
}

export interface ConversionFailedEvent {
  media: MediaEntity;
  conversionName: string;
  error: Error;
}
