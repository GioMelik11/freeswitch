import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SetModuleDto {
  @IsString()
  module!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  etag?: string;
}


