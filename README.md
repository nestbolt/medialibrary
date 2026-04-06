<p align="center">
    <h1 align="center">@nestbolt/medialibrary</h1>
    <p align="center">File uploads and media management for NestJS — associate files with entities, generate image conversions, and store on local disk or S3.</p>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/@nestbolt/medialibrary"><img src="https://img.shields.io/npm/v/@nestbolt/medialibrary.svg?style=flat-square" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/@nestbolt/medialibrary"><img src="https://img.shields.io/npm/dt/@nestbolt/medialibrary.svg?style=flat-square" alt="npm downloads"></a>
    <a href="https://github.com/nestbolt/media/actions"><img src="https://img.shields.io/github/actions/workflow/status/nestbolt/media/tests.yml?branch=main&style=flat-square&label=tests" alt="tests"></a>
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-brightgreen.svg?style=flat-square" alt="license"></a>
</p>

<hr>

This package provides a **media library** for [NestJS](https://nestjs.com) that associates files with TypeORM entities, generates image conversions via Sharp, and stores files on local disk or AWS S3.

Once installed, using it is as simple as:

```typescript
const media = await mediaService
  .addMediaFromBuffer(photoBuffer, "photo.jpg")
  .forModel("Post", post.id)
  .withCustomProperties({ alt: "A photo" })
  .toMediaCollection("images");

const url = mediaService.getUrl(media, "thumbnail");
```

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Module Configuration](#module-configuration)
  - [Static Configuration (forRoot)](#static-configuration-forroot)
  - [Async Configuration (forRootAsync)](#async-configuration-forrootasync)
- [Adding Media](#adding-media)
- [Retrieving Media](#retrieving-media)
- [Media Collections](#media-collections)
- [Image Conversions](#image-conversions)
- [Custom Properties](#custom-properties)
- [Entity Decorator & Mixin](#entity-decorator--mixin)
- [Storage Drivers](#storage-drivers)
- [URL Generation](#url-generation)
- [Events](#events)
- [Configuration Options](#configuration-options)
- [Using the Service Directly](#using-the-service-directly)
- [Standalone Usage](#standalone-usage)
- [Testing](#testing)
- [Changelog](#changelog)
- [Contributing](#contributing)
- [Security](#security)
- [Credits](#credits)
- [License](#license)

## Installation

Install the package via npm:

```bash
npm install @nestbolt/medialibrary
```

Or via yarn:

```bash
yarn add @nestbolt/medialibrary
```

Or via pnpm:

```bash
pnpm add @nestbolt/medialibrary
```

### Peer Dependencies

This package requires the following peer dependencies, which you likely already have in a NestJS project:

```
@nestjs/common      ^10.0.0 || ^11.0.0
@nestjs/core        ^10.0.0 || ^11.0.0
@nestjs/typeorm     ^10.0.0 || ^11.0.0
typeorm             ^0.3.0
reflect-metadata    ^0.1.13 || ^0.2.0
```

Optional peer dependencies:

```
sharp                    >=0.32.0       (for image conversions)
@nestjs/event-emitter    ^2.0.0 || ^3.0.0   (for lifecycle events)
@aws-sdk/client-s3       ^3.0.0         (for S3 storage)
@aws-sdk/s3-request-presigner ^3.0.0    (for signed URLs)
```

## Quick Start

### 1. Register the module in your `AppModule`

```typescript
import { MediaModule } from "@nestbolt/medialibrary";

@Module({
  imports: [
    MediaModule.forRoot({
      defaultDisk: "local",
      disks: {
        local: {
          driver: "local",
          root: "./uploads",
          urlBase: "/media",
        },
      },
    }),
  ],
})
export class AppModule {}
```

### 2. Inject and use `MediaService`

```typescript
import { MediaService } from "@nestbolt/medialibrary";

@Injectable()
export class PostService {
  constructor(private readonly mediaService: MediaService) {}

  async addPhoto(postId: string, file: Buffer): Promise<void> {
    await this.mediaService
      .addMediaFromBuffer(file, "photo.jpg")
      .forModel("Post", postId)
      .toMediaCollection("images");
  }
}
```

### 3. Retrieve media and URLs

```typescript
const media = await this.mediaService.getFirstMedia("Post", postId, "images");
const url = this.mediaService.getUrl(media, "thumbnail");
```

## Module Configuration

### Static Configuration (forRoot)

```typescript
MediaModule.forRoot({
  defaultDisk: "local",
  disks: {
    local: { driver: "local", root: "./uploads", urlBase: "/media" },
    s3: { driver: "s3", bucket: "my-bucket", region: "us-east-1" },
  },
  maxFileSize: 10 * 1024 * 1024, // 10 MB
  prefix: "media",
  baseUrl: "https://cdn.example.com",
});
```

### Async Configuration (forRootAsync)

```typescript
MediaModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    defaultDisk: config.get("MEDIA_DISK", "local"),
    disks: {
      local: { driver: "local", root: config.get("UPLOAD_DIR", "./uploads") },
      s3: {
        driver: "s3",
        bucket: config.get("S3_BUCKET"),
        region: config.get("S3_REGION"),
      },
    },
  }),
});
```

The module is registered as **global** — you don't need to import it in every module.

## Adding Media

### From a file path

```typescript
await mediaService
  .addMedia("/path/to/file.jpg")
  .forModel("Post", postId)
  .toMediaCollection("images");
```

### From a Buffer

```typescript
await mediaService
  .addMediaFromBuffer(buffer, "photo.jpg")
  .forModel("Post", postId)
  .toMediaCollection("images");
```

### From a stream

```typescript
await mediaService
  .addMediaFromStream(readableStream, "video.mp4")
  .forModel("Post", postId)
  .toMediaCollection("videos");
```

### From a URL

```typescript
const adder = await mediaService.addMediaFromUrl("https://example.com/photo.jpg");
await adder.forModel("Post", postId).toMediaCollection("images");
```

### From base64

```typescript
await mediaService
  .addMediaFromBase64(base64String, "avatar.png")
  .forModel("User", userId)
  .toMediaCollection("avatar");
```

### FileAdder options

```typescript
await mediaService
  .addMediaFromBuffer(buffer, "photo.jpg")
  .forModel("Post", postId)
  .usingName("My Photo") // Display name
  .usingFileName("custom-name.jpg") // Storage file name
  .toDisk("s3") // Override disk
  .storingConversionsOnDisk("s3") // Conversions disk
  .withCustomProperties({ alt: "A photo" }) // JSON metadata
  .setOrder(1) // Sort order
  .preservingOriginal() // Keep source file
  .sanitizingFileName((name) => name.toLowerCase())
  .toMediaCollection("images");
```

## Retrieving Media

```typescript
// All media for an entity
const all = await mediaService.getMedia("Post", postId);

// By collection
const images = await mediaService.getMedia("Post", postId, "images");

// First / last
const first = await mediaService.getFirstMedia("Post", postId, "images");
const last = await mediaService.getLastMedia("Post", postId, "images");

// Check existence
const has = await mediaService.hasMedia("Post", postId, "images");

// URLs
const url = mediaService.getUrl(media);
const thumbUrl = mediaService.getUrl(media, "thumbnail");
const path = mediaService.getPath(media);

// Signed/temporary URL (S3)
const tempUrl = await mediaService.getTemporaryUrl(media, new Date(Date.now() + 3600000));
```

## Media Collections

Define collections on your entities to constrain what files are accepted:

```typescript
@HasMedia()
@RegisterMediaCollections((addCollection) => {
  addCollection("avatar")
    .acceptsMimeTypes(["image/jpeg", "image/png", "image/webp"])
    .singleFile()                    // Only keep 1 file
    .maxFileSize(5 * 1024 * 1024)   // 5 MB max
    .useFallbackUrl("/defaults/avatar.png");

  addCollection("gallery")
    .acceptsMimeTypes(["image/jpeg", "image/png"])
    .onlyKeepLatest(20)             // Keep max 20 items
    .useDisk("s3");

  addCollection("documents");        // No restrictions
})
export class User extends HasMediaMixin(BaseEntity) { ... }
```

## Image Conversions

Define conversions to auto-generate thumbnails and variants when images are uploaded:

```typescript
@HasMedia()
@RegisterMediaConversions((addConversion) => {
  addConversion("thumbnail")
    .resize(150, 150, { fit: "cover" })
    .format("webp")
    .quality(80)
    .performOnCollections("images", "avatar");

  addConversion("preview")
    .resize(800)
    .format("webp")
    .quality(85)
    .sharpen();

  addConversion("greyscale")
    .resize(400)
    .greyscale()
    .keepOriginalImageFormat();
})
export class Post extends HasMediaMixin(BaseEntity) { ... }
```

### Available manipulations

| Method                              | Description                                       |
| ----------------------------------- | ------------------------------------------------- |
| `resize(width?, height?, options?)` | Resize image                                      |
| `crop(width, height, left?, top?)`  | Crop/extract region                               |
| `format(fmt, options?)`             | Convert format (jpeg, png, webp, avif, gif, tiff) |
| `quality(q)`                        | Output quality (0-100)                            |
| `blur(sigma?)`                      | Gaussian blur                                     |
| `sharpen(options?)`                 | Sharpen image                                     |
| `rotate(angle?)`                    | Rotate by degrees                                 |
| `flip()`                            | Flip vertically                                   |
| `flop()`                            | Flip horizontally                                 |
| `greyscale()`                       | Convert to greyscale                              |
| `negate()`                          | Invert colors                                     |
| `normalize()`                       | Normalize contrast                                |
| `withSharpOperation(op, ...args)`   | Any Sharp method                                  |

### Retrieving converted images

```typescript
const thumbUrl = mediaService.getUrl(media, "thumbnail");
const previewUrl = mediaService.getUrl(media, "preview");

// Check if conversion exists
if (media.hasGeneratedConversion("thumbnail")) {
  // use thumbnail URL
}
```

### Regenerate conversions

```typescript
await mediaService.regenerateConversions(media);
await mediaService.regenerateConversions(media, ["thumbnail"]); // specific ones
```

## Custom Properties

Attach arbitrary JSON metadata to any media item:

```typescript
// Set during upload
await mediaService
  .addMediaFromBuffer(buffer, "photo.jpg")
  .forModel("Post", postId)
  .withCustomProperties({ alt: "Sunset", credit: "John Doe" })
  .toMediaCollection("images");

// Read
media.getCustomProperty("alt"); // "Sunset"
media.getCustomProperty("missing", "N/A"); // "N/A"
media.hasCustomProperty("alt"); // true

// Update
media.setCustomProperty("alt", "New alt text");
media.forgetCustomProperty("credit");

// Nested (dot notation)
media.setCustomProperty("meta.author", "Jane");
media.getCustomProperty("meta.author"); // "Jane"
```

## Entity Decorator & Mixin

For convenience, add media methods directly to your entity:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { BaseEntity } from "typeorm";
import {
  HasMedia,
  HasMediaMixin,
  RegisterMediaCollections,
  RegisterMediaConversions,
} from "@nestbolt/medialibrary";

@Entity("posts")
@HasMedia()
@RegisterMediaCollections((addCollection) => {
  addCollection("images").singleFile();
})
@RegisterMediaConversions((addConversion) => {
  addConversion("thumbnail").resize(150, 150, { fit: "cover" }).format("webp");
})
export class Post extends HasMediaMixin(BaseEntity) {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;
}
```

Then use directly on entity instances:

```typescript
// Add media
await post.addMedia("/path/to/photo.jpg").toMediaCollection("images");
await post.addMedia(buffer, "photo.jpg").toMediaCollection("images");

// Retrieve
const images = await post.getMedia("images");
const first = await post.getFirstMedia("images");
const url = await post.getFirstMediaUrl("images", "thumbnail");
const has = await post.hasMedia("images");

// Clear
await post.clearMediaCollection("images");
await post.deleteAllMedia();
```

Media is **automatically deleted** when the entity is removed (via TypeORM subscriber).

## Storage Drivers

### Local

```typescript
disks: {
  local: {
    driver: "local",
    root: "./uploads",     // Storage directory
    urlBase: "/media",     // URL prefix for public access
  },
}
```

### AWS S3

```typescript
disks: {
  s3: {
    driver: "s3",
    bucket: "my-bucket",
    region: "us-east-1",
    prefix: "media/",                              // Optional key prefix
    credentials: {                                  // Optional (uses default chain)
      accessKeyId: "...",
      secretAccessKey: "...",
    },
    endpoint: "https://s3.custom.com",             // S3-compatible (MinIO, R2)
    forcePathStyle: true,                           // For MinIO/custom endpoints
  },
}
```

### Custom driver

Implement the `StorageDriver` interface:

```typescript
import { StorageDriver } from "@nestbolt/medialibrary";

export class MyDriver implements StorageDriver {
  async put(path: string, data: Buffer): Promise<void> { ... }
  async putStream(path: string, stream: NodeJS.ReadableStream): Promise<void> { ... }
  async get(path: string): Promise<Buffer> { ... }
  getStream(path: string): NodeJS.ReadableStream { ... }
  async delete(path: string): Promise<void> { ... }
  async deleteDirectory(path: string): Promise<void> { ... }
  async exists(path: string): Promise<boolean> { ... }
  async copy(source: string, destination: string): Promise<void> { ... }
  async move(source: string, destination: string): Promise<void> { ... }
  async size(path: string): Promise<number> { ... }
  async mimeType(path: string): Promise<string> { ... }
  url(path: string): string { ... }
  async temporaryUrl(path: string, expiration: Date): Promise<string> { ... }
}
```

## URL Generation

### Custom path generator

```typescript
import { PathGenerator, MediaEntity } from "@nestbolt/medialibrary";

export class CustomPathGenerator implements PathGenerator {
  getPath(media: MediaEntity): string {
    return `${media.collectionName}/${media.id}/`;
  }
  getPathForConversions(media: MediaEntity): string {
    return `${media.collectionName}/${media.id}/conversions/`;
  }
  getPathForResponsiveImages(media: MediaEntity): string {
    return `${media.collectionName}/${media.id}/responsive/`;
  }
}

MediaModule.forRoot({
  pathGenerator: CustomPathGenerator,
});
```

## Events

When `@nestjs/event-emitter` is installed, the following events are emitted:

| Event                         | Payload                                  |
| ----------------------------- | ---------------------------------------- |
| `media.added`                 | `{ media, modelType, modelId }`          |
| `media.deleted`               | `{ media, modelType, modelId }`          |
| `media.collection-cleared`    | `{ modelType, modelId, collectionName }` |
| `media.conversion-will-start` | `{ media, conversionName }`              |
| `media.conversion-completed`  | `{ media, conversionName }`              |
| `media.conversion-failed`     | `{ media, conversionName, error }`       |

```typescript
import { OnEvent } from "@nestjs/event-emitter";
import { MEDIA_EVENTS, MediaAddedEvent } from "@nestbolt/medialibrary";

@Injectable()
export class MediaListener {
  @OnEvent(MEDIA_EVENTS.MEDIA_ADDED)
  handleMediaAdded(event: MediaAddedEvent) {
    console.log(`Media added to ${event.modelType} #${event.modelId}`);
  }
}
```

## Configuration Options

| Option          | Type                         | Default                | Description                        |
| --------------- | ---------------------------- | ---------------------- | ---------------------------------- |
| `defaultDisk`   | `string`                     | `"local"`              | Default storage disk name          |
| `disks`         | `Record<string, DiskConfig>` | `{}`                   | Named disk configurations          |
| `maxFileSize`   | `number`                     | `10485760`             | Max file size in bytes (10 MB)     |
| `baseUrl`       | `string`                     | —                      | Base URL for all media URLs        |
| `prefix`        | `string`                     | —                      | Path prefix for all stored files   |
| `pathGenerator` | `Type<PathGenerator>`        | `DefaultPathGenerator` | Custom path generator class        |
| `urlGenerator`  | `Type<UrlGenerator>`         | `DefaultUrlGenerator`  | Custom URL generator class         |
| `fileNamer`     | `Type<FileNamer>`            | `DefaultFileNamer`     | Custom file namer class            |
| `tempDirectory` | `string`                     | —                      | Temporary directory for processing |

## Using the Service Directly

```typescript
import { MediaService } from "@nestbolt/medialibrary";

@Injectable()
export class MyService {
  constructor(private readonly mediaService: MediaService) {}
}
```

| Method                                  | Returns                        | Description                 |
| --------------------------------------- | ------------------------------ | --------------------------- |
| `addMedia(path)`                        | `FileAdder`                    | Start adding from file path |
| `addMediaFromBuffer(buf, name)`         | `FileAdder`                    | Start adding from Buffer    |
| `addMediaFromStream(stream, name)`      | `FileAdder`                    | Start adding from stream    |
| `addMediaFromUrl(url)`                  | `Promise<FileAdder>`           | Download and add from URL   |
| `addMediaFromBase64(b64, name)`         | `FileAdder`                    | Start adding from base64    |
| `getMedia(type, id, collection?)`       | `Promise<MediaEntity[]>`       | Get all media               |
| `getFirstMedia(type, id, collection?)`  | `Promise<MediaEntity \| null>` | Get first item              |
| `getLastMedia(type, id, collection?)`   | `Promise<MediaEntity \| null>` | Get last item               |
| `hasMedia(type, id, collection?)`       | `Promise<boolean>`             | Check existence             |
| `getUrl(media, conversion?)`            | `string`                       | Get URL                     |
| `getPath(media, conversion?)`           | `string`                       | Get disk path               |
| `getTemporaryUrl(media, exp, conv?)`    | `Promise<string>`              | Get signed URL              |
| `deleteMedia(id)`                       | `Promise<void>`                | Delete single item          |
| `deleteAllMedia(type, id)`              | `Promise<void>`                | Delete all for entity       |
| `clearMediaCollection(type, id, coll?)` | `Promise<void>`                | Clear collection            |
| `setOrder(ids)`                         | `Promise<void>`                | Set display order           |
| `regenerateConversions(media, names?)`  | `Promise<void>`                | Regenerate conversions      |

## Testing

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:cov
```

## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security

If you discover any security-related issues, please report them via [GitHub Issues](https://github.com/nestbolt/media/issues) with the **security** label instead of using the public issue tracker.

## Credits

- Image processing powered by [Sharp](https://sharp.pixelplumbing.com/)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.
