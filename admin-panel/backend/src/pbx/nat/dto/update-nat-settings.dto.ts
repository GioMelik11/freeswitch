import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateNatSettingsDto {
  @IsString()
  externalRtpIp!: string;

  @IsString()
  externalSipIp!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  localNetworks?: string[];

  @IsOptional()
  @IsString()
  etag?: string;

  @IsOptional()
  @IsString()
  aclEtag?: string;
}


