import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalIdShareService } from './medical-id-share.service';
import { PublicMedicalIdController } from './public-medical-id.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [MedicalRecordsController, PublicMedicalIdController],
  providers: [MedicalRecordsService, MedicalIdShareService],
})
export class MedicalRecordsModule {}
