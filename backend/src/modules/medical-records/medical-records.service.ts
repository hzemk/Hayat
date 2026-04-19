import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-db/prisma.service';
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

@Injectable()
export class MedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    conditions: { orderBy: { createdAt: 'desc' as const } },
    medications: { orderBy: { createdAt: 'desc' as const } },
    allergies: { orderBy: { createdAt: 'desc' as const } },
    emergencyContacts: { orderBy: { createdAt: 'asc' as const } },
  };

  async getForUser(userId: string) {
    return this.prisma.medicalRecord.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: this.include,
    });
  }

  async updateForUser(userId: string, dto: UpdateMedicalRecordDto) {
    await this.prisma.medicalRecord.upsert({
      where: { userId },
      create: {
        userId,
        bloodType: dto.bloodType,
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
      },
      update: {
        bloodType: dto.bloodType,
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
      },
    });
    return this.getForUser(userId);
  }

  // ───── shared owner check ────────────────────────────────────────────────

  private async ensureOwnedRecordId(userId: string): Promise<string> {
    const record = await this.prisma.medicalRecord.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true },
    });
    return record.id;
  }

  private async ensureOwnedRow<T extends { medicalRecordId: string }>(
    row: T | null,
    ownedRecordId: string,
  ): Promise<T> {
    if (!row) throw new NotFoundException('Item not found');
    if (row.medicalRecordId !== ownedRecordId) throw new ForbiddenException();
    return row;
  }

  // ───── allergies ─────────────────────────────────────────────────────────

  async createAllergy(userId: string, dto: CreateAllergyDto) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    await this.prisma.allergy.create({
      data: {
        medicalRecordId,
        substance: dto.substance.trim(),
        severity: dto.severity?.trim() || null,
        reaction: dto.reaction?.trim() || null,
      },
    });
    return this.getForUser(userId);
  }

  async updateAllergy(userId: string, id: string, dto: UpdateAllergyDto) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    const row = await this.prisma.allergy.findUnique({ where: { id } });
    await this.ensureOwnedRow(row, medicalRecordId);
    await this.prisma.allergy.update({
      where: { id },
      data: {
        substance: dto.substance?.trim(),
        severity: dto.severity !== undefined ? dto.severity?.trim() || null : undefined,
        reaction: dto.reaction !== undefined ? dto.reaction?.trim() || null : undefined,
      },
    });
    return this.getForUser(userId);
  }

  async removeAllergy(userId: string, id: string) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    const row = await this.prisma.allergy.findUnique({ where: { id } });
    await this.ensureOwnedRow(row, medicalRecordId);
    await this.prisma.allergy.delete({ where: { id } });
    return this.getForUser(userId);
  }

  // ───── conditions ────────────────────────────────────────────────────────

  async createCondition(userId: string, dto: CreateConditionDto) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    await this.prisma.condition.create({
      data: {
        medicalRecordId,
        name: dto.name.trim(),
        status: dto.status?.trim() || 'active',
        icdCode: dto.icdCode?.trim() || null,
        diagnosedAt: dto.diagnosedAt ? new Date(dto.diagnosedAt) : null,
        notes: dto.notes?.trim() || null,
      },
    });
    return this.getForUser(userId);
  }

  async updateCondition(userId: string, id: string, dto: UpdateConditionDto) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    const row = await this.prisma.condition.findUnique({ where: { id } });
    await this.ensureOwnedRow(row, medicalRecordId);
    await this.prisma.condition.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        status: dto.status?.trim(),
        icdCode: dto.icdCode !== undefined ? dto.icdCode?.trim() || null : undefined,
        diagnosedAt:
          dto.diagnosedAt !== undefined
            ? dto.diagnosedAt
              ? new Date(dto.diagnosedAt)
              : null
            : undefined,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
      },
    });
    return this.getForUser(userId);
  }

  async removeCondition(userId: string, id: string) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    const row = await this.prisma.condition.findUnique({ where: { id } });
    await this.ensureOwnedRow(row, medicalRecordId);
    await this.prisma.condition.delete({ where: { id } });
    return this.getForUser(userId);
  }

  // ───── medications ───────────────────────────────────────────────────────

  async createMedication(userId: string, dto: CreateMedicationDto) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    await this.prisma.medication.create({
      data: {
        medicalRecordId,
        name: dto.name.trim(),
        dose: dto.dose?.trim() || null,
        frequency: dto.frequency?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });
    return this.getForUser(userId);
  }

  async updateMedication(userId: string, id: string, dto: UpdateMedicationDto) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    const row = await this.prisma.medication.findUnique({ where: { id } });
    await this.ensureOwnedRow(row, medicalRecordId);
    await this.prisma.medication.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        dose: dto.dose !== undefined ? dto.dose?.trim() || null : undefined,
        frequency:
          dto.frequency !== undefined ? dto.frequency?.trim() || null : undefined,
        notes: dto.notes !== undefined ? dto.notes?.trim() || null : undefined,
      },
    });
    return this.getForUser(userId);
  }

  async removeMedication(userId: string, id: string) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    const row = await this.prisma.medication.findUnique({ where: { id } });
    await this.ensureOwnedRow(row, medicalRecordId);
    await this.prisma.medication.delete({ where: { id } });
    return this.getForUser(userId);
  }

  // ───── emergency contacts ────────────────────────────────────────────────

  async createEmergencyContact(
    userId: string,
    dto: CreateEmergencyContactDto,
  ) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    await this.prisma.emergencyContact.create({
      data: {
        medicalRecordId,
        name: dto.name.trim(),
        relationship: dto.relationship.trim(),
        phoneNumber: dto.phoneNumber.trim(),
      },
    });
    return this.getForUser(userId);
  }

  async updateEmergencyContact(
    userId: string,
    id: string,
    dto: UpdateEmergencyContactDto,
  ) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    const row = await this.prisma.emergencyContact.findUnique({ where: { id } });
    await this.ensureOwnedRow(row, medicalRecordId);
    await this.prisma.emergencyContact.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        relationship: dto.relationship?.trim(),
        phoneNumber: dto.phoneNumber?.trim(),
      },
    });
    return this.getForUser(userId);
  }

  async removeEmergencyContact(userId: string, id: string) {
    const medicalRecordId = await this.ensureOwnedRecordId(userId);
    const row = await this.prisma.emergencyContact.findUnique({ where: { id } });
    await this.ensureOwnedRow(row, medicalRecordId);
    await this.prisma.emergencyContact.delete({ where: { id } });
    return this.getForUser(userId);
  }
}
