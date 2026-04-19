import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { MedicalRecordsService } from './medical-records.service';
import { MedicalIdShareService } from './medical-id-share.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { CreateAllergyDto, UpdateAllergyDto } from './dto/allergy.dto';
import { CreateConditionDto, UpdateConditionDto } from './dto/condition.dto';
import {
  CreateMedicationDto,
  UpdateMedicationDto,
} from './dto/medication.dto';
import {
  CreateEmergencyContactDto,
  UpdateEmergencyContactDto,
} from './dto/emergency-contact.dto';

@Controller('medical-record')
export class MedicalRecordsController {
  constructor(
    private readonly records: MedicalRecordsService,
    private readonly share: MedicalIdShareService,
  ) {}

  @Get('me')
  me(@CurrentUser('userId') userId: string) {
    return this.records.getForUser(userId);
  }

  @Patch('me')
  updateMe(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateMedicalRecordDto,
  ) {
    return this.records.updateForUser(userId, dto);
  }

  @Post('me/share-token')
  async createShareToken(@CurrentUser('userId') userId: string) {
    const { token, expiresAt } = await this.share.sign(userId);
    return { token, expiresAt: expiresAt.toISOString(), path: `m/${token}` };
  }

  // ───── allergies ─────
  @Post('me/allergies')
  createAllergy(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateAllergyDto,
  ) {
    return this.records.createAllergy(userId, dto);
  }

  @Patch('me/allergies/:id')
  updateAllergy(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAllergyDto,
  ) {
    return this.records.updateAllergy(userId, id, dto);
  }

  @Delete('me/allergies/:id')
  removeAllergy(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.records.removeAllergy(userId, id);
  }

  // ───── conditions ─────
  @Post('me/conditions')
  createCondition(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateConditionDto,
  ) {
    return this.records.createCondition(userId, dto);
  }

  @Patch('me/conditions/:id')
  updateCondition(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConditionDto,
  ) {
    return this.records.updateCondition(userId, id, dto);
  }

  @Delete('me/conditions/:id')
  removeCondition(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.records.removeCondition(userId, id);
  }

  // ───── medications ─────
  @Post('me/medications')
  createMedication(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateMedicationDto,
  ) {
    return this.records.createMedication(userId, dto);
  }

  @Patch('me/medications/:id')
  updateMedication(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicationDto,
  ) {
    return this.records.updateMedication(userId, id, dto);
  }

  @Delete('me/medications/:id')
  removeMedication(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.records.removeMedication(userId, id);
  }

  // ───── emergency contacts ─────
  @Post('me/emergency-contacts')
  createEmergencyContact(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateEmergencyContactDto,
  ) {
    return this.records.createEmergencyContact(userId, dto);
  }

  @Patch('me/emergency-contacts/:id')
  updateEmergencyContact(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmergencyContactDto,
  ) {
    return this.records.updateEmergencyContact(userId, id, dto);
  }

  @Delete('me/emergency-contacts/:id')
  removeEmergencyContact(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.records.removeEmergencyContact(userId, id);
  }
}
