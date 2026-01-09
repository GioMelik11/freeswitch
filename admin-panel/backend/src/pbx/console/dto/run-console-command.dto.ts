import { IsString, MaxLength, MinLength } from 'class-validator';

export class RunConsoleCommandDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  command!: string;
}


