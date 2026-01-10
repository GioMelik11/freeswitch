import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateSipAiDto {
  @IsOptional()
  @IsString()
  geminiSocketUrl?: string;

  @IsOptional()
  @IsArray()
  @Matches(/^\d+$/, { each: true })
  extensions?: string[];
}


