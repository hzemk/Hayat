import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class ScanPrescriptionDto {
  @IsString()
  @MinLength(100)
  @MaxLength(12_000_000)
  imageBase64!: string;

  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  mimeType!: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';
}
