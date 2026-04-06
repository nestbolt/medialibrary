export class DiskNotConfiguredException extends Error {
  constructor(diskName: string, availableDisks: string[]) {
    const available = availableDisks.length > 0 ? availableDisks.join(", ") : "(none)";
    super(`Disk "${diskName}" is not configured. Available disks: ${available}`);
    this.name = "DiskNotConfiguredException";
  }
}
