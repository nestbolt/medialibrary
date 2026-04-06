export interface LocalDiskConfig {
  driver: "local";
  root?: string;
  urlBase?: string;
}

export interface S3DiskConfig {
  driver: "s3";
  bucket: string;
  region?: string;
  prefix?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  endpoint?: string;
  forcePathStyle?: boolean;
  client?: any;
}

export type DiskConfig = LocalDiskConfig | S3DiskConfig;
