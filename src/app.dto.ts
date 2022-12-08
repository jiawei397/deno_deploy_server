import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "deno_class_validator";

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

  @IsString()
  @MaxLength(100)
  strict_version: string;

  @IsBoolean()
  @IsOptional()
  is_local?: boolean;

  /** 等待容器启动时间，单位分钟 */
  @IsNumber()
  @IsOptional()
  timeout?: number;
}
