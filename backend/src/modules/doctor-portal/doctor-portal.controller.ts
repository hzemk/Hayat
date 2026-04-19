import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DoctorPortalService } from './doctor-portal.service';
import { DoctorSendMessageDto } from './dto/doctor-send-message.dto';
import { IssuePrescriptionDto } from './dto/issue-prescription.dto';
import { CreateDoctorReminderDto } from './dto/create-doctor-reminder.dto';
import { SetScheduleDto } from './dto/set-schedule.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RolesGuard } from '@common/guards/roles.guard';

@Controller('doctor')
@UseGuards(RolesGuard)
@Roles(UserRole.DOCTOR)
export class DoctorPortalController {
  constructor(private readonly service: DoctorPortalService) {}

  @Get('me')
  me(@CurrentUser('userId') userId: string) {
    return this.service.getMyDoctorProfile(userId);
  }

  @Patch('me/availability')
  setAvailability(
    @CurrentUser('userId') userId: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.service.updateAvailability(userId, !!isAvailable);
  }

  @Get('me/schedule')
  getSchedule(@CurrentUser('userId') userId: string) {
    return this.service.getMySchedule(userId);
  }

  @Put('me/schedule')
  setSchedule(
    @CurrentUser('userId') userId: string,
    @Body() dto: SetScheduleDto,
  ) {
    return this.service.setMySchedule(userId, dto.days);
  }

  @Get('patients')
  patients(@CurrentUser('userId') userId: string) {
    return this.service.listPatients(userId);
  }

  @Get('patients/:patientId')
  patient(
    @CurrentUser('userId') userId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.service.getPatient(userId, patientId);
  }

  @Get('threads')
  threads(@CurrentUser('userId') userId: string) {
    return this.service.listThreads(userId);
  }

  @Get('threads/:patientId/messages')
  messages(
    @CurrentUser('userId') userId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.service.listMessages(userId, patientId);
  }

  @Post('threads/:patientId/messages')
  send(
    @CurrentUser('userId') userId: string,
    @Param('patientId') patientId: string,
    @Body() dto: DoctorSendMessageDto,
  ) {
    return this.service.sendMessage(userId, patientId, dto);
  }

  @Post('prescriptions')
  @HttpCode(201)
  issue(
    @CurrentUser('userId') userId: string,
    @Body() dto: IssuePrescriptionDto,
  ) {
    return this.service.issuePrescription(userId, dto);
  }

  @Get('prescriptions')
  listIssued(@CurrentUser('userId') userId: string) {
    return this.service.listIssued(userId);
  }

  @Get('patients/:patientId/reminders')
  listPatientReminders(
    @CurrentUser('userId') userId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.service.listPatientReminders(userId, patientId);
  }

  @Post('patients/:patientId/reminders')
  @HttpCode(201)
  createPatientReminder(
    @CurrentUser('userId') userId: string,
    @Param('patientId') patientId: string,
    @Body() dto: CreateDoctorReminderDto,
  ) {
    return this.service.createPatientReminder(userId, patientId, dto);
  }

  @Delete('patients/:patientId/reminders/:reminderId')
  @HttpCode(204)
  deletePatientReminder(
    @CurrentUser('userId') userId: string,
    @Param('patientId') patientId: string,
    @Param('reminderId') reminderId: string,
  ) {
    return this.service.deletePatientReminder(userId, patientId, reminderId);
  }
}
