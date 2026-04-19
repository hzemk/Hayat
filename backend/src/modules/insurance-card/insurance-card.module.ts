import { Module } from '@nestjs/common';
import { InsuranceCardController } from './insurance-card.controller';
import { InsuranceCardService } from './insurance-card.service';

@Module({
  controllers: [InsuranceCardController],
  providers: [InsuranceCardService],
  exports: [InsuranceCardService],
})
export class InsuranceCardModule {}
