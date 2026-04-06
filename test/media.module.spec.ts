import { describe, it, expect, afterEach } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MediaModule } from "../src/media.module";
import { MediaService } from "../src/media.service";
import { MediaEntity } from "../src/entities/media.entity";
import { DiskManager } from "../src/storage/disk-manager";
import { FileManipulator } from "../src/file-manipulator";
import { MEDIA_OPTIONS, PATH_GENERATOR, URL_GENERATOR, FILE_NAMER } from "../src/media.constants";

describe("MediaModule", () => {
  let module: TestingModule;

  afterEach(async () => {
    await module?.close();
  });

  it("should create module with forRoot and default options", async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRoot(),
      ],
    }).compile();
    await module.init();

    expect(module.get(MediaService)).toBeDefined();
    expect(module.get(DiskManager)).toBeDefined();
    expect(module.get(FileManipulator)).toBeDefined();
    expect(module.get(MEDIA_OPTIONS)).toBeDefined();
    expect(module.get(PATH_GENERATOR)).toBeDefined();
    expect(module.get(URL_GENERATOR)).toBeDefined();
    expect(module.get(FILE_NAMER)).toBeDefined();
  });

  it("should create module with forRootAsync", async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRootAsync({
          useFactory: () => ({
            defaultDisk: "local",
            disks: {
              local: { driver: "local" as const, root: "/tmp" },
            },
          }),
        }),
      ],
    }).compile();
    await module.init();

    expect(module.get(MediaService)).toBeDefined();
    expect(module.get(DiskManager)).toBeDefined();

    const options = module.get(MEDIA_OPTIONS);
    expect(options.defaultDisk).toBe("local");
  });

  it("forRootAsync should resolve path generator and file namer from options", async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: "better-sqlite3",
          database: ":memory:",
          entities: [MediaEntity],
          synchronize: true,
        }),
        MediaModule.forRootAsync({
          useFactory: () => ({}),
        }),
      ],
    }).compile();
    await module.init();

    const pathGen = module.get(PATH_GENERATOR);
    const fileNamer = module.get(FILE_NAMER);
    expect(pathGen).toBeDefined();
    expect(fileNamer).toBeDefined();
  });
});
