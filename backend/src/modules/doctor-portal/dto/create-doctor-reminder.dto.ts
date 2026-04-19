import { ReminderType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDoctorReminderDto {
  @IsEnum(ReminderType)
  type!: ReminderType;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  subtitle?: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  recurrence?: string;

  // Duration in days. 0 or omitted means single-shot (no duration).
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  durationDays?: number;
}
