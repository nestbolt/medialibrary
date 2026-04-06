import type { FileNamer } from "../interfaces/file-namer.interface";
import { getBaseName } from "../helpers";

export class DefaultFileNamer implements FileNamer {
  originalFileName(fileName: string): string {
    return getBaseName(fileName);
  }

  conversionFileName(fileName: string, conversionName: string): string {
    return `${conversionName}-${getBaseName(fileName)}`;
  }
}
