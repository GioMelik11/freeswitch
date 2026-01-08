import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpsertExtensionDto {
  @Matches(/^\d+$/)
  id!: string;

  @IsString()
  password!: string;

  @IsString()
  userContext!: string;

  @IsString()
  callerIdName!: string;

  @IsString()
  callerIdNumber!: string;

  @IsOptional()
  @IsString()
  callgroup?: string;

  // Optional outgoing media override (used by dialplan)
  @IsOptional()
  @IsString()
  outgoingSound?: string;

  @IsOptional()
  @IsString()
  outgoingIvr?: string;

  // If set, calls that do not get answered by this extension can be forwarded to an external number (mobile)
  @IsOptional()
  @IsString()
  forwardMobile?: string;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @IsString()
  aiServiceId?: string;

  @IsOptional()
  @IsString()
  etag?: string;
}


