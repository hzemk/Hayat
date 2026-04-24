import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('reminders')
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  list(
    @CurrentUser('userId') userId: string,
    @Query('scope') scope?: 'upcoming' | 'all',
    @Query('limit') limit?: string,
  ) {
    if (scope === 'upcoming') {
      const parsed = limit ? Math.min(parseInt(limit, 10) || 5, 20) : 5;
      return this.reminders.listUpcoming(userId, parsed);
    }
    return this.reminders.listMine(userId);
  }

  @Get(':id')
  getOne(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.reminders.getOne(userId, id);
  }
}
