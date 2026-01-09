import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSipSettingsDto {
  @IsString()
  internalSipPort!: string;

  @IsString()
  externalSipPort!: string;

  @IsString()
  internalTlsPort!: string;

  @IsString()
  externalTlsPort!: string;

  @IsBoolean()
  internalSslEnable!: boolean;

  @IsBoolean()
  externalSslEnable!: boolean;

  @IsBoolean()
  internalAuthCalls!: boolean;

  @IsBoolean()
  externalAuthCalls!: boolean;

  @IsOptional()
  @IsString()
  etag?: string;
}


