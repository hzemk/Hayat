import { Module } from '@nestjs/common';
import { HospitalPortalController } from './hospital-portal.controller';
import { HospitalPortalService } from './hospital-portal.service';
import { InsuranceCardModule } from '../insurance-card/insurance-card.module';

@Module({
  imports: [InsuranceCardModule],
  controllers: [HospitalPortalController],
  providers: [HospitalPortalService],
})
export class HospitalPortalModule {}
