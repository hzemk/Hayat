import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAllergyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  substance!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reaction?: string;
}

export class UpdateAllergyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  substance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  severity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reaction?: string;
}
