import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ArrayMaxSize,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePrescriptionItemDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  medicationName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  dose!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  frequency!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationDays?: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  instructionsAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  instructionsEn?: string;
}

export class CreatePrescriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CreatePrescriptionItemDto)
  items!: CreatePrescriptionItemDto[];
}
