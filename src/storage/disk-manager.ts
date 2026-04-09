import { Inject, Injectable } from "@nestjs/common";
import { MEDIA_OPTIONS } from "../media.constants";
import type { MediaModuleOptions } from "../interfaces";
import type { StorageDriver } from "../interfaces/storage-driver.interface";
import type { DiskConfig } from "./storage.types";
import { LocalDriver } from "./drivers/local.driver";
import { S3Driver } from "./drivers/s3.driver";
import { DiskNotConfiguredException } from "../exceptions";

@Injectable()
export class DiskManager {
  private readonly drivers = new Map<string, StorageDriver>();

  constructor(@Inject(MEDIA_OPTIONS) private readonly options: MediaModuleOptions) {}

  disk(name?: string): StorageDriver {
    const diskName = name ?? this.options.defaultDisk ?? "local";

    const cached = this.drivers.get(diskName);
    if (cached) return cached;

    const config = this.options.disks?.[diskName];

    if (!config) {
      if (diskName === "local") {
        const driver = new LocalDriver();
        this.drivers.set(diskName, driver);
        return driver;
      }
      throw new DiskNotConfiguredException(diskName, Object.keys(this.options.disks ?? {}));
    }

    const driver = this.createDriver(config);
    this.drivers.set(diskName, driver);
    return driver;
  }

  private createDriver(config: DiskConfig): StorageDriver {
    switch (config.driver) {
      case "local":
        return new LocalDriver(config);
      case "s3":
        return new S3Driver(config);
      default:
        throw new Error(`Unknown storage driver: "${(config as any).driver}"`);
    }
  }
}
