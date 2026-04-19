import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  InsuranceCoverageScope,
  InsuranceCoverageType,
} from '@prisma/client';

export class UpsertInsuranceCardDto {
  @ValidateIf((o) => !o.userEmail)
  @IsUUID()
  userId?: string;

  @ValidateIf((o) => !o.userId)
  @IsEmail()
  userEmail?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  provider!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  providerAr?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(40)
  memberNumber!: string;

  @IsString()
  @Matches(/^[0-9]{6,15}$/)
  nationalId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  holderName!: string;

  @IsEnum(InsuranceCoverageType)
  coverageType!: InsuranceCoverageType;

  @IsEnum(InsuranceCoverageScope)
  coverageScope!: InsuranceCoverageScope;

  @IsDateString()
  validFrom!: string;

  @IsDateString()
  validUntil!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;
}
