import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RateDoctorDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
