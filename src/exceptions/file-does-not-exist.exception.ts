export class FileDoesNotExistException extends Error {
  constructor(path: string) {
    super(`File does not exist at path: ${path}`);
    this.name = "FileDoesNotExistException";
  }
}
