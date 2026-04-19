import { Module } from '@nestjs/common';
import { SosContactsController } from './sos-contacts.controller';
import { SosContactsService } from './sos-contacts.service';

@Module({
  controllers: [SosContactsController],
  providers: [SosContactsService],
})
export class SosContactsModule {}
