import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class IssuePrescriptionItemDto {
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

export class IssuePrescriptionDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => IssuePrescriptionItemDto)
  items!: IssuePrescriptionItemDto[];
}
