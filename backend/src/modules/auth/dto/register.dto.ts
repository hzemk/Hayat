import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Matches,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class DoctorRegisterProfileDto {
  @IsString()
  @Length(3, 40)
  licenseNumber!: string;

  @IsString()
  @Length(2, 80)
  specialty!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  specialtyAr?: string;
}

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @Length(8, 72)
  password!: string;

  @IsString()
  @Length(2, 120)
  fullName!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+962\d{9}$/, {
    message: 'phoneNumber must be a Jordanian number in +962XXXXXXXXX format',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @Length(2, 8)
  preferredLocale?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ValidateIf((o) => o.role === UserRole.DOCTOR)
  @ValidateNested()
  @Type(() => DoctorRegisterProfileDto)
  doctorProfile?: DoctorRegisterProfileDto;
}
