export class FileIsTooBigException extends Error {
  constructor(fileSize: number, maxSize: number) {
    const fileMB = (fileSize / 1024 / 1024).toFixed(2);
    const maxMB = (maxSize / 1024 / 1024).toFixed(2);
    super(`File size ${fileMB} MB exceeds the maximum allowed size of ${maxMB} MB.`);
    this.name = "FileIsTooBigException";
  }
}
