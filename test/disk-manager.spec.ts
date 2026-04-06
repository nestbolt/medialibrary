import { describe, it, expect } from "vitest";
import { DiskManager } from "../src/storage/disk-manager";
import { LocalDriver } from "../src/storage/drivers/local.driver";
import { DiskNotConfiguredException } from "../src/exceptions";

describe("DiskManager", () => {
  it("should return a default local driver when no disks configured", () => {
    const manager = new DiskManager({});
    const driver = manager.disk();

    expect(driver).toBeInstanceOf(LocalDriver);
  });

  it("should return the default disk when no name specified", () => {
    const manager = new DiskManager({
      defaultDisk: "uploads",
      disks: {
        uploads: { driver: "local", root: "/tmp/uploads" },
      },
    });

    const driver = manager.disk();
    expect(driver).toBeInstanceOf(LocalDriver);
  });

  it("should return the named disk", () => {
    const manager = new DiskManager({
      disks: {
        local: { driver: "local", root: "/tmp" },
      },
    });

    const driver = manager.disk("local");
    expect(driver).toBeInstanceOf(LocalDriver);
  });

  it("should cache drivers", () => {
    const manager = new DiskManager({
      disks: {
        local: { driver: "local", root: "/tmp" },
      },
    });

    const d1 = manager.disk("local");
    const d2 = manager.disk("local");
    expect(d1).toBe(d2);
  });

  it("should throw for unknown disk name", () => {
    const manager = new DiskManager({
      disks: {
        local: { driver: "local" },
      },
    });

    expect(() => manager.disk("nonexistent")).toThrow(DiskNotConfiguredException);
  });

  it("should list available disks in error message", () => {
    const manager = new DiskManager({
      disks: {
        uploads: { driver: "local" },
        backups: { driver: "local" },
      },
    });

    expect(() => manager.disk("missing")).toThrow(/uploads, backups/);
  });
});
