import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateSosContactDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  // TODO(hardening): address in dedicated cleanup
  // eslint-disable-next-line no-useless-escape
  @Matches(/^\+?[0-9 \-]{6,20}$/, {
    message: 'phoneNumber must be a valid phone number',
  })
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  relationship?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(99)
  priority?: number;
}
