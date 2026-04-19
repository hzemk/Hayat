import { Body, Controller, Get, HttpCode, Patch } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

class UpdatePushTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  expoPushToken?: string | null;
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser('userId') userId: string) {
    return this.users.getProfile(userId);
  }

  @Patch('me')
  update(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(userId, dto);
  }

  @Patch('me/push-token')
  @HttpCode(204)
  async setPushToken(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdatePushTokenDto,
  ) {
    await this.users.setPushToken(userId, dto.expoPushToken ?? null);
  }
}
