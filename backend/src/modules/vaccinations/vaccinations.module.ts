import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VaccinationsController } from './vaccinations.controller';
import { VaccinationsService } from './vaccinations.service';
import { VaccineCertShareService } from './vaccine-cert-share.service';
import { PublicVaccineCertController } from './public-vaccine-cert.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [VaccinationsController, PublicVaccineCertController],
  providers: [VaccinationsService, VaccineCertShareService],
  exports: [VaccineCertShareService],
})
export class VaccinationsModule {}
