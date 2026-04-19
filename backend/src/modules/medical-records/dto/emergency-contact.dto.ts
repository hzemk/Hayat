import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PHONE_RE = /^\+?[0-9 \-]{6,20}$/;

export class CreateEmergencyContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  relationship!: string;

  @IsString()
  @Matches(PHONE_RE, { message: 'phoneNumber must be a valid phone number' })
  phoneNumber!: string;
}

export class UpdateEmergencyContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  relationship?: string;

  @IsOptional()
  @IsString()
  @Matches(PHONE_RE, { message: 'phoneNumber must be a valid phone number' })
  phoneNumber?: string;
}
