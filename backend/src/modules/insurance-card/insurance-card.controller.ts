import { Controller, Get, Post } from '@nestjs/common';
import { InsuranceCardService } from './insurance-card.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('insurance-card')
export class InsuranceCardController {
  constructor(private readonly service: InsuranceCardService) {}

  @Get()
  getMine(@CurrentUser('userId') userId: string) {
    return this.service.getMine(userId);
  }

  @Post('sync-sanad')
  syncSanad(@CurrentUser('userId') userId: string) {
    return this.service.syncFromSanad(userId);
  }
}
