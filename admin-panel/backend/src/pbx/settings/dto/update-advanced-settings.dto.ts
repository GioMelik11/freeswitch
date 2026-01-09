import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAdvancedSettingsDto {
  @IsString()
  defaultPassword!: string;

  @IsString()
  holdMusic!: string;

  @IsString()
  globalCodecPrefs!: string;

  @IsString()
  outboundCodecPrefs!: string;

  @IsString()
  rtpStartPort!: string;

  @IsString()
  rtpEndPort!: string;

  @IsString()
  consoleLoglevel!: string;

  @IsBoolean()
  callDebug!: boolean;

  @IsBoolean()
  rtpDebug!: boolean;

  @IsBoolean()
  mediaDebug!: boolean;

  @IsOptional()
  @IsString()
  sipTlsVersion?: string;

  @IsOptional()
  @IsString()
  sipTlsCiphers?: string;

  @IsOptional()
  @IsString()
  recordingsDir?: string;

  @IsOptional()
  @IsString()
  presencePrivacy?: string;

  @IsOptional()
  @IsString()
  etag?: string;
}


