import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  // TODO(hardening): address in dedicated cleanup
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateMedicalRecordDto {
  @IsOptional()
  @IsString()
  @Matches(/^(A|B|AB|O)[+-]$/, {
    message: 'bloodType must be one of A+/A-/B+/B-/AB+/AB-/O+/O-',
  })
  bloodType?: string;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(260)
  heightCm?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(2)
  @Max(400)
  weightKg?: number;
}
