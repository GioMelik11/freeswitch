import { IsOptional, IsString } from 'class-validator';

export class WriteFileDto {
  @IsString()
  path!: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  etag?: string;
}
