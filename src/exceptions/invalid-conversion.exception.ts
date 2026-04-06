export class InvalidConversionException extends Error {
  constructor(conversionName: string) {
    super(`Conversion "${conversionName}" is not defined.`);
    this.name = "InvalidConversionException";
  }
}
