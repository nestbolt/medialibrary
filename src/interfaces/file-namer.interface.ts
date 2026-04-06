export interface FileNamer {
  originalFileName(fileName: string): string;
  conversionFileName(fileName: string, conversionName: string): string;
}
