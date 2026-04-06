import { describe, it, expect } from "vitest";
import { DefaultFileNamer } from "../src/generators/default-file-namer";

describe("DefaultFileNamer", () => {
  const namer = new DefaultFileNamer();

  it("should return base name for original file", () => {
    expect(namer.originalFileName("photo.jpg")).toBe("photo");
    expect(namer.originalFileName("my-document.pdf")).toBe("my-document");
  });

  it("should handle files without extensions", () => {
    expect(namer.originalFileName("README")).toBe("README");
  });

  it("should return conversion file name", () => {
    expect(namer.conversionFileName("photo.jpg", "thumbnail")).toBe("thumbnail-photo");
    expect(namer.conversionFileName("doc.pdf", "preview")).toBe("preview-doc");
  });
});
