import type { ConversionConfig, SharpManipulation } from "./interfaces/conversion.interface";

export class ConversionBuilder {
  private readonly _name: string;
  private _performOnCollections: string[] = [];
  private _queued: boolean = false;
  private _keepOriginalImageFormat: boolean = false;
  private _manipulations: SharpManipulation[] = [];

  constructor(name: string) {
    this._name = name;
  }

  resize(width?: number, height?: number, options?: Record<string, any>): this {
    this._manipulations.push({
      operation: "resize",
      args: [width ?? null, height ?? null, options],
    });
    return this;
  }

  crop(width: number, height: number, left?: number, top?: number): this {
    this._manipulations.push({
      operation: "extract",
      args: [{ width, height, left: left ?? 0, top: top ?? 0 }],
    });
    return this;
  }

  format(
    format: "jpeg" | "png" | "webp" | "avif" | "gif" | "tiff",
    options?: Record<string, any>,
  ): this {
    this._manipulations.push({
      operation: "toFormat",
      args: [format, options],
    });
    return this;
  }

  quality(quality: number): this {
    this._manipulations.push({
      operation: "__quality",
      args: [quality],
    });
    return this;
  }

  blur(sigma?: number): this {
    this._manipulations.push({
      operation: "blur",
      args: sigma != null ? [sigma] : [],
    });
    return this;
  }

  sharpen(options?: { sigma?: number; m1?: number; m2?: number }): this {
    this._manipulations.push({
      operation: "sharpen",
      args: options ? [options] : [],
    });
    return this;
  }

  rotate(angle?: number): this {
    this._manipulations.push({
      operation: "rotate",
      args: angle != null ? [angle] : [],
    });
    return this;
  }

  flip(): this {
    this._manipulations.push({ operation: "flip", args: [] });
    return this;
  }

  flop(): this {
    this._manipulations.push({ operation: "flop", args: [] });
    return this;
  }

  greyscale(): this {
    this._manipulations.push({ operation: "greyscale", args: [] });
    return this;
  }

  negate(): this {
    this._manipulations.push({ operation: "negate", args: [] });
    return this;
  }

  normalize(): this {
    this._manipulations.push({ operation: "normalise", args: [] });
    return this;
  }

  withSharpOperation(operation: string, ...args: any[]): this {
    this._manipulations.push({ operation, args });
    return this;
  }

  performOnCollections(...collections: string[]): this {
    this._performOnCollections = collections;
    return this;
  }

  queued(): this {
    this._queued = true;
    return this;
  }

  nonQueued(): this {
    this._queued = false;
    return this;
  }

  keepOriginalImageFormat(): this {
    this._keepOriginalImageFormat = true;
    return this;
  }

  build(): ConversionConfig {
    return {
      name: this._name,
      performOnCollections: [...this._performOnCollections],
      queued: this._queued,
      keepOriginalImageFormat: this._keepOriginalImageFormat,
      manipulations: [...this._manipulations],
    };
  }
}
