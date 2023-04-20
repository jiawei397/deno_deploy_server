import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "deno_class_validator";

export enum StrictVersion {
  Major = "major",
  Minor = "minor",
  Patch = "patch",
  None = "",
}

export class UpgradeDto {
  @IsString()
  @MaxLength(1000)
  project: string;

  @IsString()
  @MaxLength(1000)
  repository: string;

  @IsString()
  @MaxLength(100)
  version: string;

  @IsString()
  @MaxLength(100)
  hostname: string;

  @IsEnum(StrictVersion)
  strict_version: StrictVersion;

  @IsBoolean()
  @IsOptional()
  is_local?: boolean;

  /** 等待容器启动时间，单位分钟 */
  @IsNumber()
  @IsOptional()
  timeout?: number;
}
