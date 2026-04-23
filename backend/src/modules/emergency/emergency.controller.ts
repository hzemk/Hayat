import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EmergencyService } from './emergency.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergency: EmergencyService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('request')
  request(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateEmergencyDto,
  ) {
    return this.emergency.request(userId, dto);
  }

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.emergency.listMine(userId);
  }
}
