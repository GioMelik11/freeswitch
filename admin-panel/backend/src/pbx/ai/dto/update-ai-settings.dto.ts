import { IsOptional, IsString } from 'class-validator';

export class UpdateAiSettingsDto {
  @IsString()
  audioStreamUrl!: string;

  @IsOptional()
  @IsString()
  etag?: string;
}
