import { DynamicModule, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MediaEntity } from "./entities/media.entity";
import { FileManipulator } from "./file-manipulator";
import { DefaultFileNamer } from "./generators/default-file-namer";
import { DefaultPathGenerator } from "./generators/default-path-generator";
import { DefaultUrlGenerator } from "./generators/default-url-generator";
import type { MediaAsyncOptions, MediaModuleOptions } from "./interfaces";
import { FILE_NAMER, MEDIA_OPTIONS, PATH_GENERATOR, URL_GENERATOR } from "./media.constants";
import { MediaService } from "./media.service";
import { MediaSubscriber } from "./media.subscriber";
import { DiskManager } from "./storage/disk-manager";

@Module({})
export class MediaModule {
  static forRoot(options: MediaModuleOptions = {}): DynamicModule {
    return {
      module: MediaModule,
      global: true,
      imports: [TypeOrmModule.forFeature([MediaEntity])],
      providers: [
        { provide: MEDIA_OPTIONS, useValue: options },
        { provide: PATH_GENERATOR, useClass: options.pathGenerator ?? DefaultPathGenerator },
        { provide: FILE_NAMER, useClass: options.fileNamer ?? DefaultFileNamer },
        DiskManager,
        FileManipulator,
        {
          provide: URL_GENERATOR,
          useClass: options.urlGenerator ?? DefaultUrlGenerator,
        },
        MediaService,
        MediaSubscriber,
      ],
      exports: [
        MediaService,
        DiskManager,
        FileManipulator,
        MEDIA_OPTIONS,
        PATH_GENERATOR,
        URL_GENERATOR,
        FILE_NAMER,
      ],
    };
  }

  static forRootAsync(asyncOptions: MediaAsyncOptions): DynamicModule {
    return {
      module: MediaModule,
      global: true,
      imports: [...(asyncOptions.imports ?? []), TypeOrmModule.forFeature([MediaEntity])],
      providers: [
        {
          provide: MEDIA_OPTIONS,
          useFactory: asyncOptions.useFactory,
          inject: asyncOptions.inject ?? [],
        },
        {
          provide: PATH_GENERATOR,
          useFactory: (options: MediaModuleOptions) => {
            const Cls = options.pathGenerator ?? DefaultPathGenerator;
            return new Cls();
          },
          inject: [MEDIA_OPTIONS],
        },
        {
          provide: FILE_NAMER,
          useFactory: (options: MediaModuleOptions) => {
            const Cls = options.fileNamer ?? DefaultFileNamer;
            return new Cls();
          },
          inject: [MEDIA_OPTIONS],
        },
        DiskManager,
        FileManipulator,
        {
          provide: URL_GENERATOR,
          useFactory: (
            options: MediaModuleOptions,
            pathGenerator: any,
            diskManager: DiskManager,
          ) => {
            const Cls = options.urlGenerator ?? DefaultUrlGenerator;
            return new Cls(options, pathGenerator, diskManager);
          },
          inject: [MEDIA_OPTIONS, PATH_GENERATOR, DiskManager],
        },
        MediaService,
        MediaSubscriber,
      ],
      exports: [
        MediaService,
        DiskManager,
        FileManipulator,
        MEDIA_OPTIONS,
        PATH_GENERATOR,
        URL_GENERATOR,
        FILE_NAMER,
      ],
    };
  }
}
