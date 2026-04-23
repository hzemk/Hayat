import {
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateHospitalDoctorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  licenseNumber!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  specialty!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  specialtyAr?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  // TODO(hardening): address in dedicated cleanup
  // eslint-disable-next-line no-useless-escape
  @Matches(/^\+?[0-9 \-]{6,20}$/)
  phoneNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(70)
  yearsExperience?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;
}
