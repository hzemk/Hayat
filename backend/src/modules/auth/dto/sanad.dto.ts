import { IsOptional, IsString, Length } from 'class-validator';

export class SanadCallbackDto {
  @IsString()
  @Length(1, 512)
  code!: string;

  @IsOptional()
  @IsString()
  @Length(1, 512)
  state?: string;
}
