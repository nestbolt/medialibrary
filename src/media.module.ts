import { DynamicModule, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MediaEntity } from "./entities/media.entity";
import { MediaService } from "./media.service";
import { DiskManager } from "./storage/disk-manager";
import { FileManipulator } from "./file-manipulator";
import { MediaSubscriber } from "./media.subscriber";
import { DefaultPathGenerator } from "./generators/default-path-generator";
import { DefaultUrlGenerator } from "./generators/default-url-generator";
import { DefaultFileNamer } from "./generators/default-file-namer";
import { MEDIA_OPTIONS, PATH_GENERATOR, URL_GENERATOR, FILE_NAMER } from "./media.constants";
import type { MediaModuleOptions, MediaAsyncOptions } from "./interfaces";

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
      imports: [
        ...(asyncOptions.imports ?? []),
        TypeOrmModule.forFeature([MediaEntity]),
      ],
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
          useClass: DefaultUrlGenerator,
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
