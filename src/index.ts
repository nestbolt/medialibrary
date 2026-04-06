// Module
export { MediaModule } from "./media.module";

// Constants
export {
  MEDIA_OPTIONS,
  PATH_GENERATOR,
  URL_GENERATOR,
  FILE_NAMER,
  DEFAULT_MAX_FILE_SIZE,
  DEFAULT_COLLECTION_NAME,
} from "./media.constants";

// Service
export { MediaService } from "./media.service";

// Entity
export { MediaEntity } from "./entities";

// Builders
export { FileAdder } from "./file-adder";
export type { FileSource, FileAdderAttacher } from "./file-adder";
export { ConversionBuilder } from "./conversion-builder";
export { MediaCollectionBuilder } from "./media-collection-builder";

// File Manipulator
export { FileManipulator } from "./file-manipulator";

// Decorators
export { HasMedia, HasMediaOptions } from "./decorators";
export { RegisterMediaCollections, RegisterMediaConversions } from "./decorators";

// Mixins
export { HasMediaMixin } from "./mixins";
export type { HasMediaEntity } from "./mixins";

// Events
export {
  MEDIA_EVENTS,
  MediaAddedEvent,
  MediaUpdatedEvent,
  MediaDeletedEvent,
  CollectionClearedEvent,
  ConversionWillStartEvent,
  ConversionCompletedEvent,
  ConversionFailedEvent,
} from "./events";

// Interfaces
export type {
  ConversionConfig,
  SharpManipulation,
  MediaCollectionConfig,
  FileInfo,
  StorageDriver,
  PathGenerator,
  UrlGenerator,
  FileNamer,
  MediaModuleOptions,
  MediaAsyncOptions,
} from "./interfaces";

// Exceptions
export {
  FileDoesNotExistException,
  FileIsTooBigException,
  FileUnacceptableException,
  InvalidConversionException,
  DiskNotConfiguredException,
} from "./exceptions";

// Generators
export { DefaultPathGenerator } from "./generators";
export { DefaultUrlGenerator } from "./generators";
export { DefaultFileNamer } from "./generators";

// Storage
export { DiskManager } from "./storage";
export { LocalDriver, S3Driver } from "./storage";
export type { LocalDiskConfig, S3DiskConfig, DiskConfig } from "./storage";

// Helpers
export {
  generateUuid,
  detectMimeType,
  getExtension,
  getExtensionFromMime,
  sanitizeFileName,
  getBaseName,
  formatBytes,
  getFileType,
} from "./helpers";

// Subscriber
export { MediaSubscriber } from "./media.subscriber";
