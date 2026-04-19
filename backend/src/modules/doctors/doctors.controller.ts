import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { SendMessageDto } from './dto/send-message.dto';
import { RateDoctorDto } from './dto/rate-doctor.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller()
export class DoctorsController {
  constructor(private readonly doctors: DoctorsService) {}

  @Get('doctors')
  list() {
    return this.doctors.listDoctors();
  }

  @Get('doctors/:id')
  get(@Param('id') id: string) {
    return this.doctors.getDoctor(id);
  }

  @Post('doctors/:id/select')
  @HttpCode(200)
  select(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.doctors.setDefaultDoctor(userId, id);
  }

  @Get('doctor-threads')
  listThreads(@CurrentUser('userId') userId: string) {
    return this.doctors.listMyThreads(userId);
  }

  @Get('doctor-threads/unread-count')
  unread(@CurrentUser('userId') userId: string) {
    return this.doctors.unreadCount(userId).then((count) => ({ count }));
  }

  @Get('doctor-threads/:doctorId/messages')
  messages(
    @CurrentUser('userId') userId: string,
    @Param('doctorId') doctorId: string,
  ) {
    return this.doctors.listMessages(userId, doctorId);
  }

  @Post('doctor-threads/:doctorId/messages')
  send(
    @CurrentUser('userId') userId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.doctors.sendMessage(userId, doctorId, dto);
  }

  @Post('doctor-threads/:doctorId/messages/:messageId/read')
  @HttpCode(200)
  read(
    @CurrentUser('userId') userId: string,
    @Param('doctorId') doctorId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.doctors.markRead(userId, doctorId, messageId);
  }

  @Get('doctor-threads/:doctorId/rating')
  myRating(
    @CurrentUser('userId') userId: string,
    @Param('doctorId') doctorId: string,
  ) {
    return this.doctors.getMyRating(userId, doctorId);
  }

  @Post('doctor-threads/:doctorId/rating')
  @HttpCode(200)
  rate(
    @CurrentUser('userId') userId: string,
    @Param('doctorId') doctorId: string,
    @Body() dto: RateDoctorDto,
  ) {
    return this.doctors.rateDoctor(userId, doctorId, dto);
  }
}
