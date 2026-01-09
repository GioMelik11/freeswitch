import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

class DestDto {
  @IsString()
  type!: string;

  @IsOptional()
  @IsString()
  target?: string;
}

class OutgoingDto {
  @IsString()
  type!: string; // none | sound | ivr

  @IsOptional()
  @IsString()
  sound?: string;

  @IsOptional()
  @IsString()
  ivr?: string;
}

class PrefixRuleDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsString()
  prefix!: string;

  @IsOptional()
  @IsString()
  prepend?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpsertTrunkDto {
  @Matches(/^[a-zA-Z0-9_-]+$/)
  name!: string;

  @IsBoolean()
  register!: boolean;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  realm?: string;

  @IsOptional()
  @IsString()
  proxy?: string;

  @IsOptional()
  @IsString()
  fromUser?: string;

  @IsOptional()
  @IsString()
  fromDomain?: string;

  @IsOptional()
  @IsString()
  extension?: string;

  @IsOptional()
  @IsString()
  transport?: string;

  @IsOptional()
  inboundDestination?: DestDto;

  @IsOptional()
  outgoingDefault?: OutgoingDto;

  @IsOptional()
  @IsArray()
  prefixRules?: PrefixRuleDto[];

  @IsOptional()
  @IsString()
  etag?: string;
}
