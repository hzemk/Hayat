import { IsEnum, IsObject, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DoctorMessageKind } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  @IsOptional()
  @IsEnum(DoctorMessageKind)
  kind?: DoctorMessageKind;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
