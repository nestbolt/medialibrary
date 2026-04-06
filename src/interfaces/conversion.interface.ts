export interface SharpManipulation {
  operation: string;
  args: any[];
}

export interface ConversionConfig {
  name: string;
  performOnCollections: string[];
  queued: boolean;
  keepOriginalImageFormat: boolean;
  manipulations: SharpManipulation[];
}
