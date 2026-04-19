import { Module } from '@nestjs/common';
import { DoctorPortalController } from './doctor-portal.controller';
import { DoctorPortalService } from './doctor-portal.service';

@Module({
  controllers: [DoctorPortalController],
  providers: [DoctorPortalService],
})
export class DoctorPortalModule {}
