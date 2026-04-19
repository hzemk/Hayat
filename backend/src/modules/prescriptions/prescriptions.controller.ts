import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { ScanPrescriptionDto } from './dto/scan-prescription.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.prescriptions.listMine(userId);
  }

  @Post('scan')
  scan(
    @CurrentUser('userId') userId: string,
    @Body() dto: ScanPrescriptionDto,
  ) {
    return this.prescriptions.scan(userId, dto);
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptions.create(userId, dto);
  }

  @Get(':id')
  get(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
  ) {
    return this.prescriptions.getById(userId, id);
  }
}
