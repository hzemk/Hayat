import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ChatDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsString()
  @MaxLength(2000)
  message!: string;
}
