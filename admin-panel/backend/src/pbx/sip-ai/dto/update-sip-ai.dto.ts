import { IsArray, IsObject, IsOptional } from 'class-validator';

export class UpdateSipAiDto {
  @IsOptional()
  @IsObject()
  defaults?: {
    sipServerAddr?: string;
    sipDomain?: string;
    sipContactHost?: string;
    sdpIP?: string;
    sipListenAddr?: string;
    sipPass?: string;
    registerExpires?: number;
  };

  @IsOptional()
  @IsArray()
  agents?: Array<{
    id?: string;
    source?: 'pbx' | 'external';
    extension?: string;
    sipUser?: string;
    sipPass?: string;
    sipServerAddr?: string;
    sipDomain?: string;
    geminiSocketUrl?: string;
    enabled?: boolean;
  }>;
}


