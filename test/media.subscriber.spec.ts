import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "reflect-metadata";
import { MediaSubscriber } from "../src/media.subscriber";
import { MediaService } from "../src/media.service";
import { HAS_MEDIA_METADATA_KEY } from "../src/media.constants";

describe("MediaSubscriber", () => {
  let subscriber: MediaSubscriber;
  const mockDataSource = { subscribers: [] as any[] };

  beforeEach(() => {
    subscriber = new MediaSubscriber(mockDataSource as any);
  });

  afterEach(() => {
    mockDataSource.subscribers = [];
    vi.restoreAllMocks();
  });

  it("should register itself with the data source", () => {
    expect(mockDataSource.subscribers).toContain(subscriber);
  });

  it("should do nothing if event.entity is null", () => {
    const result = subscriber.afterRemove({ entity: null } as any);
    expect(result).toBeUndefined();
  });

  it("should do nothing if entity has no @HasMedia metadata", () => {
    class PlainEntity {
      id = "1";
    }
    const result = subscriber.afterRemove({
      entity: new PlainEntity(),
    } as any);
    expect(result).toBeUndefined();
  });

  it("should do nothing if MediaService instance is not available", () => {
    class TestEntity {
      id = "1";
    }
    Reflect.defineMetadata(HAS_MEDIA_METADATA_KEY, { modelType: "TestEntity" }, TestEntity);

    const originalGetInstance = MediaService.getInstance;
    vi.spyOn(MediaService, "getInstance").mockReturnValue(null);

    const result = subscriber.afterRemove({
      entity: new TestEntity(),
    } as any);
    expect(result).toBeUndefined();

    vi.spyOn(MediaService, "getInstance").mockImplementation(originalGetInstance);
  });

  it("should call deleteAllMedia when entity has @HasMedia and service exists", () => {
    class MarkedEntity {
      id = "42";
    }
    Reflect.defineMetadata(
      HAS_MEDIA_METADATA_KEY,
      { modelType: "MarkedEntity" },
      MarkedEntity,
    );

    const mockDeleteAll = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(MediaService, "getInstance").mockReturnValue({
      deleteAllMedia: mockDeleteAll,
    } as any);

    const result = subscriber.afterRemove({
      entity: new MarkedEntity(),
    } as any);

    expect(result).toBeInstanceOf(Promise);
    expect(mockDeleteAll).toHaveBeenCalledWith("MarkedEntity", "42");
  });

  it("should use constructor name if modelType not in metadata", () => {
    class FallbackEntity {
      id = "99";
    }
    Reflect.defineMetadata(HAS_MEDIA_METADATA_KEY, {}, FallbackEntity);

    const mockDeleteAll = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(MediaService, "getInstance").mockReturnValue({
      deleteAllMedia: mockDeleteAll,
    } as any);

    subscriber.afterRemove({ entity: new FallbackEntity() } as any);

    expect(mockDeleteAll).toHaveBeenCalledWith("FallbackEntity", "99");
  });

  it("should return undefined if entity id is falsy", () => {
    class NoIdEntity {
      id = "";
    }
    Reflect.defineMetadata(
      HAS_MEDIA_METADATA_KEY,
      { modelType: "NoIdEntity" },
      NoIdEntity,
    );

    vi.spyOn(MediaService, "getInstance").mockReturnValue({
      deleteAllMedia: vi.fn(),
    } as any);

    const result = subscriber.afterRemove({
      entity: new NoIdEntity(),
    } as any);

    // id is "" which is falsy — should return before calling deleteAllMedia
    expect(result).toBeUndefined();
  });
});
