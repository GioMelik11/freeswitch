import { IsArray, IsIn, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class IvrEntryDto {
    @IsString()
    digits!: string;

    @IsIn(['transfer', 'queue', 'ivr', 'app'])
    type!: 'transfer' | 'queue' | 'ivr' | 'app';

    @IsString()
    target!: string;
}

export class UpsertIvrDto {
    @Matches(/^[a-zA-Z0-9_-]+$/)
    name!: string;

    @IsOptional()
    @IsString()
    greetLong?: string;

    @IsOptional()
    @IsString()
    greetShort?: string;

    @IsOptional()
    @IsString()
    invalidSound?: string;

    @IsOptional()
    @IsString()
    exitSound?: string;

    @IsOptional()
    @IsString()
    timeout?: string;

    @IsOptional()
    @IsString()
    interDigitTimeout?: string;

    @IsOptional()
    @IsString()
    maxFailures?: string;

    @IsOptional()
    @IsString()
    maxTimeouts?: string;

    @IsOptional()
    @IsString()
    digitLen?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IvrEntryDto)
    entries!: IvrEntryDto[];

    @IsOptional()
    @IsString()
    etag?: string;
}


