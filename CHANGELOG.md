# Changelog

All notable changes to `@nestbolt/medialibrary` will be documented in this file.

## v0.1.0 — Initial Release

### Features

- **Media entity** — Polymorphic file association with any TypeORM entity
- **File uploads** — Add media from local paths, buffers, streams, URLs, or base64
- **Collections** — Organize media into named groups with MIME filtering, single-file, and size limits
- **Image conversions** — Generate thumbnails and variants via Sharp (resize, crop, format, quality, blur, sharpen, rotate, flip, greyscale)
- **Storage drivers** — Local filesystem and AWS S3 with pluggable driver interface
- **URL generation** — Public URLs and signed/temporary URLs for cloud storage
- **Custom properties** — Attach arbitrary JSON metadata to media items
- **Entity decorator & mixin** — `@HasMedia()` decorator and `HasMediaMixin()` for adding media methods to entities
- **Auto-cleanup** — TypeORM subscriber automatically deletes media files when entities are removed
- **Events** — Lifecycle events for media additions, deletions, and conversions via `@nestjs/event-emitter`
- **Customizable** — Pluggable path generators, URL generators, and file namers
