import { Injectable, Logger } from "@nestjs/common";
import type { ConversionConfig, SharpManipulation } from "./interfaces/conversion.interface";
import { getExtensionFromMime } from "./helpers";

@Injectable()
export class FileManipulator {
  private readonly logger = new Logger(FileManipulator.name);

  async performConversion(
    sourceBuffer: Buffer,
    conversion: ConversionConfig,
    originalMimeType: string,
  ): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
    let sharp: any;
    try {
      sharp = require("sharp");
    } catch {
      throw new Error("sharp is required for image conversions. Install it: pnpm add sharp");
    }

    let pipeline = sharp(sourceBuffer);
    let outputFormat: string | null = null;
    let outputOptions: Record<string, any> = {};
    let quality: number | null = null;

    for (const manipulation of conversion.manipulations) {
      if (manipulation.operation === "__quality") {
        quality = manipulation.args[0];
        continue;
      }

      if (manipulation.operation === "toFormat") {
        outputFormat = manipulation.args[0];
        if (manipulation.args[1]) {
          outputOptions = { ...outputOptions, ...manipulation.args[1] };
        }
        continue;
      }

      pipeline = this.applyManipulation(pipeline, manipulation);
    }

    if (outputFormat) {
      if (quality != null) {
        outputOptions.quality = quality;
      }
      pipeline = pipeline.toFormat(outputFormat, outputOptions);
    } else if (quality != null) {
      const inferredFormat = this.inferFormatFromMime(originalMimeType);
      if (inferredFormat) {
        pipeline = pipeline.toFormat(inferredFormat, { quality });
      }
    } else if (conversion.keepOriginalImageFormat) {
      // Keep original format — no conversion needed
    }

    const resultBuffer: Buffer = await pipeline.toBuffer();

    const resultMimeType = outputFormat
      ? this.formatToMime(outputFormat)
      : originalMimeType;
    const resultExtension = outputFormat
      ? outputFormat
      : getExtensionFromMime(originalMimeType) || "bin";

    return {
      buffer: resultBuffer,
      mimeType: resultMimeType,
      extension: resultExtension,
    };
  }

  isImage(mimeType: string): boolean {
    return mimeType.startsWith("image/") && !mimeType.includes("svg");
  }

  private applyManipulation(pipeline: any, manipulation: SharpManipulation): any {
    const { operation, args } = manipulation;

    if (typeof pipeline[operation] !== "function") {
      this.logger.warn(`Unknown Sharp operation: "${operation}". Skipping.`);
      return pipeline;
    }

    return pipeline[operation](...args);
  }

  private inferFormatFromMime(mimeType: string): string | null {
    const map: Record<string, string> = {
      "image/jpeg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
      "image/gif": "gif",
      "image/tiff": "tiff",
    };
    return map[mimeType] ?? null;
  }

  private formatToMime(format: string): string {
    const map: Record<string, string> = {
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      avif: "image/avif",
      gif: "image/gif",
      tiff: "image/tiff",
    };
    return map[format] ?? "application/octet-stream";
  }
}
