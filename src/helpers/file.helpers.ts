import { lookup, extension as mimeExtension } from "mime-types";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";

export function generateUuid(): string {
  return uuidv4();
}

export function detectMimeType(fileName: string): string {
  return lookup(fileName) || "application/octet-stream";
}

export function getExtension(fileName: string): string {
  const ext = path.extname(fileName);
  return ext ? ext.slice(1).toLowerCase() : "";
}

export function getExtensionFromMime(mimeType: string): string {
  return mimeExtension(mimeType) || "";
}

export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^\w\s.\-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function getBaseName(fileName: string): string {
  return path.basename(fileName, path.extname(fileName));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function getFileType(mimeType: string): string {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/")) return "document";
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return "spreadsheet";
  }
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    return "presentation";
  }
  if (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType === "application/rtf"
  ) {
    return "document";
  }
  if (mimeType.includes("zip") || mimeType.includes("archive") || mimeType.includes("tar")) {
    return "archive";
  }
  return "other";
}
