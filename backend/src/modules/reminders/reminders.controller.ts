import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
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

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateReminderDto,
  ) {
    return this.reminders.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.reminders.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.reminders.remove(userId, id);
  }
}
