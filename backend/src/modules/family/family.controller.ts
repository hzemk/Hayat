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
import { FamilyService } from './family.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { CreateFamilyMedicationDto } from './dto/create-family-medication.dto';
import { CreateFamilyReminderDto } from './dto/create-family-reminder.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('family')
export class FamilyController {
  constructor(private readonly family: FamilyService) {}

  @Get('members')
  list(@CurrentUser('userId') userId: string) {
    return this.family.listMembers(userId);
  }

  @Post('members')
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateFamilyMemberDto,
  ) {
    return this.family.createMember(userId, dto);
  }

  @Post('sync')
  sync(@CurrentUser('userId') userId: string) {
    return this.family.syncFromSanad(userId);
  }

  @Get('members/:id')
  get(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.family.getMember(userId, id);
  }

  @Patch('members/:id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFamilyMemberDto,
  ) {
    return this.family.updateMember(userId, id, dto);
  }

  @Delete('members/:id')
  @HttpCode(204)
  remove(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.family.removeMember(userId, id);
  }

  @Post('members/:id/medications')
  addMedication(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateFamilyMedicationDto,
  ) {
    return this.family.addMedication(userId, id, dto);
  }

  @Delete('members/:id/medications/:medicationId')
  @HttpCode(204)
  removeMedication(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('medicationId') medicationId: string,
  ) {
    return this.family.removeMedication(userId, id, medicationId);
  }

  @Get('members/:id/reminders')
  listReminders(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Query('scope') scope?: 'upcoming' | 'all',
  ) {
    return this.family.listReminders(userId, id, scope ?? 'upcoming');
  }

  @Post('members/:id/reminders')
  createReminder(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateFamilyReminderDto,
  ) {
    return this.family.createReminder(userId, id, dto);
  }

  @Patch('members/:id/reminders/:reminderId/done')
  markReminderDone(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Param('reminderId') reminderId: string,
  ) {
    return this.family.markReminderDone(userId, id, reminderId);
  }
}
