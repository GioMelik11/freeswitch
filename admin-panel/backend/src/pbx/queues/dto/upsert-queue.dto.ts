import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

class DestDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  target?: string;
}

export class UpsertQueueDto {
  // short name without @domain
  @Matches(/^[a-zA-Z0-9_-]+$/)
  name!: string;

  @IsOptional()
  @IsString()
  domain?: string; // default

  @IsOptional()
  @IsString()
  strategy?: string;

  @IsOptional()
  @IsString()
  mohSound?: string;

  @IsOptional()
  @IsString()
  maxWaitTime?: string;

  @IsOptional()
  @IsString()
  discardAbandonedAfter?: string;

  // Dialplan number to reach this queue (admin panel-generated dialplan)
  @IsOptional()
  @IsString()
  extensionNumber?: string;

  // What to do after queue timeout (admin panel-generated routing)
  @IsOptional()
  timeoutDestination?: DestDto;

  // extensions to act as agents for this queue (e.g. ["1001","1002"])
  @IsOptional()
  @IsArray()
  agentExtensions?: string[];

  @IsOptional()
  @IsString()
  etag?: string;
}
