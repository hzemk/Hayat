import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.appointments.listMine(userId);
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAppointmentDto,
  ) {
    return this.appointments.create(userId, dto);
  }

  @Delete(':id')
  cancel(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.appointments.cancel(userId, id);
  }
}
