import { IsDateString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAppointmentDto {
  @IsUUID()
  hospitalId!: string;

  @IsUUID()
  departmentId!: string;

  @IsOptional()
  @IsUUID()
  doctorId?: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
