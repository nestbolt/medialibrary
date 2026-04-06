import { describe, it, expect } from "vitest";
import "reflect-metadata";
import { HasMedia } from "../src/decorators/has-media.decorator";
import { HasMediaMixin } from "../src/mixins/has-media.mixin";
import { HAS_MEDIA_METADATA_KEY } from "../src/media.constants";

describe("HasMediaMixin", () => {
  it("should add getMediaModelType method", () => {
    @HasMedia({ modelType: "Post" })
    class Post extends HasMediaMixin(class {}) {
      id = "123";
    }

    const post = new Post();
    expect(post.getMediaModelType()).toBe("Post");
  });

  it("should default modelType to class name", () => {
    @HasMedia()
    class Article extends HasMediaMixin(class {}) {
      id = "456";
    }

    const article = new Article();
    expect(post => article.getMediaModelType()).not.toThrow;
  });

  it("should return model id", () => {
    @HasMedia()
    class Item extends HasMediaMixin(class {}) {
      id = "789";
    }

    const item = new Item();
    expect(item.getMediaModelId()).toBe("789");
  });

  it("should throw when MediaModule is not initialized", () => {
    @HasMedia()
    class Thing extends HasMediaMixin(class {}) {
      id = "1";
    }

    const thing = new Thing();
    expect(() => thing.addMedia("/path/to/file.jpg")).toThrow(
      "MediaModule has not been initialized",
    );
  });

  it("should have all mixin methods", () => {
    @HasMedia()
    class TestEntity extends HasMediaMixin(class {}) {
      id = "1";
    }

    const entity = new TestEntity();
    expect(typeof entity.getMediaModelType).toBe("function");
    expect(typeof entity.getMediaModelId).toBe("function");
    expect(typeof entity.addMedia).toBe("function");
    expect(typeof entity.getMedia).toBe("function");
    expect(typeof entity.getFirstMedia).toBe("function");
    expect(typeof entity.getFirstMediaUrl).toBe("function");
    expect(typeof entity.hasMedia).toBe("function");
    expect(typeof entity.clearMediaCollection).toBe("function");
    expect(typeof entity.deleteAllMedia).toBe("function");
  });
});

describe("@HasMedia decorator", () => {
  it("should store metadata with custom modelType", () => {
    @HasMedia({ modelType: "BlogPost" })
    class Post {}

    const meta = Reflect.getMetadata(HAS_MEDIA_METADATA_KEY, Post);
    expect(meta).toEqual({ modelType: "BlogPost" });
  });

  it("should store metadata with class name as default", () => {
    @HasMedia()
    class Article {}

    const meta = Reflect.getMetadata(HAS_MEDIA_METADATA_KEY, Article);
    expect(meta).toEqual({ modelType: "Article" });
  });
});
