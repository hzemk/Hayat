import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PrescriptionStatus } from '@prisma/client';

export class UpdatePrescriptionItemDto {
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

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsEnum(PrescriptionStatus)
  status?: PrescriptionStatus;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => UpdatePrescriptionItemDto)
  items?: UpdatePrescriptionItemDto[];
}
