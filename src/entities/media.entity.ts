import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { formatBytes, getExtension, getFileType } from "../helpers";

@Entity("media")
@Index(["modelType", "modelId"])
export class MediaEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "model_type", type: "varchar", length: 255 })
  modelType!: string;

  @Column({ name: "model_id", type: "varchar", length: 255 })
  modelId!: string;

  @Column({ name: "uuid", type: "varchar", length: 36, unique: true, nullable: true })
  uuid!: string | null;

  @Column({ name: "collection_name", type: "varchar", length: 255, default: "default" })
  collectionName!: string;

  @Column({ name: "name", type: "varchar", length: 255 })
  name!: string;

  @Column({ name: "file_name", type: "varchar", length: 255 })
  fileName!: string;

  @Column({ name: "mime_type", type: "varchar", length: 255, nullable: true })
  mimeType!: string | null;

  @Column({ name: "disk", type: "varchar", length: 255 })
  disk!: string;

  @Column({ name: "conversions_disk", type: "varchar", length: 255, nullable: true })
  conversionsDisk!: string | null;

  @Column({ name: "size", type: "bigint" })
  size!: number;

  @Column({ name: "manipulations", type: "simple-json", default: "{}" })
  manipulations!: Record<string, any>;

  @Column({ name: "custom_properties", type: "simple-json", default: "{}" })
  customProperties!: Record<string, any>;

  @Column({ name: "generated_conversions", type: "simple-json", default: "{}" })
  generatedConversions!: Record<string, boolean>;

  @Column({ name: "responsive_images", type: "simple-json", default: "{}" })
  responsiveImages!: Record<string, any>;

  @Column({ name: "order_column", type: "int", nullable: true })
  @Index()
  orderColumn!: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // --- Custom properties ---

  hasCustomProperty(key: string): boolean {
    return this.getNestedValue(this.customProperties, key) !== undefined;
  }

  getCustomProperty(key: string, fallback?: any): any {
    const value = this.getNestedValue(this.customProperties, key);
    return value !== undefined ? value : fallback;
  }

  setCustomProperty(key: string, value: any): this {
    this.setNestedValue(this.customProperties, key, value);
    return this;
  }

  forgetCustomProperty(key: string): this {
    this.deleteNestedValue(this.customProperties, key);
    return this;
  }

  // --- Generated conversions ---

  hasGeneratedConversion(name: string): boolean {
    return this.generatedConversions[name] === true;
  }

  markConversionAsGenerated(name: string): this {
    this.generatedConversions = { ...this.generatedConversions, [name]: true };
    return this;
  }

  markConversionAsNotGenerated(name: string): this {
    this.generatedConversions = { ...this.generatedConversions, [name]: false };
    return this;
  }

  // --- Computed properties ---

  get humanReadableSize(): string {
    return formatBytes(Number(this.size));
  }

  get extension(): string {
    return getExtension(this.fileName);
  }

  get type(): string {
    return getFileType(this.mimeType || "");
  }

  // --- Private helpers ---

  private getNestedValue(obj: Record<string, any>, key: string): any {
    const keys = key.split(".");
    let current: any = obj;
    for (const k of keys) {
      if (current == null || typeof current !== "object") return undefined;
      current = current[k];
    }
    return current;
  }

  private setNestedValue(obj: Record<string, any>, key: string, value: any): void {
    const keys = key.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] == null || typeof current[keys[i]] !== "object") {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }

  private deleteNestedValue(obj: Record<string, any>, key: string): void {
    const keys = key.split(".");
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] == null || typeof current[keys[i]] !== "object") return;
      current = current[keys[i]];
    }
    delete current[keys[keys.length - 1]];
  }
}
