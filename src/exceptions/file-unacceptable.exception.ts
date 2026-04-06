export class FileUnacceptableException extends Error {
  constructor(fileName: string, collectionName: string, reason?: string) {
    const msg = reason
      ? `File "${fileName}" is not acceptable for collection "${collectionName}": ${reason}`
      : `File "${fileName}" is not acceptable for collection "${collectionName}".`;
    super(msg);
    this.name = "FileUnacceptableException";
  }
}
