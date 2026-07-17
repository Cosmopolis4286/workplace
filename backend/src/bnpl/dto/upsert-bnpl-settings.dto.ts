import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class UpsertBnplSettingsDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsString()
  publicApiKey?: string;

  @IsOptional()
  @IsString()
  privateApiKey?: string;

  @IsOptional()
  @IsString()
  storeId?: string;

  @IsOptional()
  @IsString()
  storeName?: string;

  @IsOptional()
  @IsString()
  externalClientId?: string;

  @IsOptional()
  @IsObject()
  extraConfig?: Record<string, unknown>;
}
