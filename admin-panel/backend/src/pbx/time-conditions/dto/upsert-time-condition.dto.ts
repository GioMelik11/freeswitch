import {
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DestDto {
  @IsIn(['transfer', 'ivr', 'queue'])
  type!: 'transfer' | 'ivr' | 'queue';

  @IsString()
  target!: string;
}

export class UpsertTimeConditionDto {
  @IsString()
  name!: string;

  @IsString()
  extensionNumber!: string;

  @IsArray()
  days!: number[];

  @IsInt()
  @Min(0)
  @Max(23)
  startHour!: number;

  @IsInt()
  @Min(0)
  @Max(23)
  endHour!: number;

  @ValidateNested()
  @Type(() => DestDto)
  onMatch!: DestDto;

  @ValidateNested()
  @Type(() => DestDto)
  onElse!: DestDto;

  @IsString()
  etag!: string;
}
