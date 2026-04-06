// Module
export { MediaModule } from "./media.module";

// Constants
export {
  DEFAULT_COLLECTION_NAME,
  DEFAULT_MAX_FILE_SIZE,
  FILE_NAMER,
  MEDIA_OPTIONS,
  PATH_GENERATOR,
  URL_GENERATOR,
} from "./media.constants";

// Service
export { MediaService } from "./media.service";

// Entity
export { MediaEntity } from "./entities";

// Builders
export { ConversionBuilder } from "./conversion-builder";
export { FileAdder } from "./file-adder";
export type { FileAdderAttacher, FileSource } from "./file-adder";
export { MediaCollectionBuilder } from "./media-collection-builder";

// File Manipulator
export { FileManipulator } from "./file-manipulator";

// Decorators
export {
  clearMediaRegistries,
  HasMedia,
  HasMediaOptions,
  RegisterMediaCollections,
  RegisterMediaConversions,
} from "./decorators";

// Mixins
export { HasMediaMixin } from "./mixins";
export type { HasMediaEntity } from "./mixins";

// Events
export {
  CollectionClearedEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
  ConversionWillStartEvent,
  MEDIA_EVENTS,
  MediaAddedEvent,
  MediaDeletedEvent,
} from "./events";

// Interfaces
export type {
  ConversionConfig,
  FileInfo,
  FileNamer,
  MediaAsyncOptions,
  MediaCollectionConfig,
  MediaModuleOptions,
  PathGenerator,
  SharpManipulation,
  StorageDriver,
  UrlGenerator,
} from "./interfaces";

// Exceptions
export {
  DiskNotConfiguredException,
  FileDoesNotExistException,
  FileIsTooBigException,
  FileUnacceptableException,
  InvalidConversionException,
} from "./exceptions";

// Generators
export { DefaultFileNamer, DefaultPathGenerator, DefaultUrlGenerator } from "./generators";

// Storage
export { DiskManager, LocalDriver, S3Driver } from "./storage";
export type { DiskConfig, LocalDiskConfig, S3DiskConfig } from "./storage";

// Helpers
export {
  detectMimeType,
  formatBytes,
  generateUuid,
  getBaseName,
  getExtension,
  getExtensionFromMime,
  getFileType,
  sanitizeFileName,
} from "./helpers";

// Subscriber
export { MediaSubscriber } from "./media.subscriber";
