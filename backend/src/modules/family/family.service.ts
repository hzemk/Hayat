import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthProvider, Prisma, ReminderStatus } from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';
import { CreateFamilyMemberDto } from './dto/create-family-member.dto';
import { UpdateFamilyMemberDto } from './dto/update-family-member.dto';
import { CreateFamilyMedicationDto } from './dto/create-family-medication.dto';
import { CreateFamilyReminderDto } from './dto/create-family-reminder.dto';
import { fetchSanadDependents } from './sanad-mock';

@Injectable()
export class FamilyService {
  constructor(private readonly prisma: PrismaService) {}

  listMembers(guardianId: string) {
    return this.prisma.familyMember.findMany({
      where: { guardianId },
      orderBy: [{ needsUrgentCare: 'desc' }, { dateOfBirth: 'asc' }],
      include: {
        medications: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async getMember(guardianId: string, memberId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
      include: {
        medications: { orderBy: { createdAt: 'desc' } },
        reminders: {
          where: { status: ReminderStatus.PENDING },
          orderBy: { scheduledAt: 'asc' },
          take: 10,
        },
      },
    });
    if (!member) throw new NotFoundException('Family member not found');
    if (member.guardianId !== guardianId) throw new ForbiddenException();
    return member;
  }

  async createMember(guardianId: string, dto: CreateFamilyMemberDto) {
    return this.prisma.familyMember.create({
      data: {
        guardianId,
        fullName: dto.fullName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        relationship: dto.relationship ?? 'child',
        nationalId: dto.nationalId,
        bloodType: dto.bloodType,
        allergies: dto.allergies ?? [],
        conditions: dto.conditions ?? [],
        needsUrgentCare: dto.needsUrgentCare ?? false,
        urgentCareNote: dto.urgentCareNote,
      },
    });
  }

  async updateMember(
    guardianId: string,
    memberId: string,
    dto: UpdateFamilyMemberDto,
  ) {
    await this.assertOwned(guardianId, memberId);
    return this.prisma.familyMember.update({
      where: { id: memberId },
      data: {
        fullName: dto.fullName,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        relationship: dto.relationship,
        nationalId: dto.nationalId,
        bloodType: dto.bloodType,
        allergies: dto.allergies,
        conditions: dto.conditions,
        needsUrgentCare: dto.needsUrgentCare,
        urgentCareNote: dto.urgentCareNote,
      },
    });
  }

  async removeMember(guardianId: string, memberId: string) {
    await this.assertOwned(guardianId, memberId);
    await this.prisma.familyMember.delete({ where: { id: memberId } });
  }

  async syncFromSanad(guardianId: string) {
    const guardian = await this.prisma.user.findUnique({
      where: { id: guardianId },
      select: { id: true, sanadId: true, authProvider: true },
    });
    if (!guardian) throw new NotFoundException('User not found');
    if (guardian.authProvider !== AuthProvider.SANAD || !guardian.sanadId) {
      throw new BadRequestException(
        'Sanad sync is only available for accounts linked with Sanad',
      );
    }

    const dependents = fetchSanadDependents(guardian.sanadId);

    const upserted = await this.prisma.$transaction(
      dependents.map((d) =>
        this.prisma.familyMember.upsert({
          where: { sanadSubject: d.sanadSubject },
          update: {
            guardianId,
            fullName: d.fullName,
            dateOfBirth: new Date(d.dateOfBirth),
            gender: d.gender,
            relationship: d.relationship,
            nationalId: d.nationalId,
          },
          create: {
            guardianId,
            sanadSubject: d.sanadSubject,
            fullName: d.fullName,
            dateOfBirth: new Date(d.dateOfBirth),
            gender: d.gender,
            relationship: d.relationship,
            nationalId: d.nationalId,
          },
        }),
      ),
    );

    return { synced: upserted.length, members: upserted };
  }

  async addMedication(
    guardianId: string,
    memberId: string,
    dto: CreateFamilyMedicationDto,
  ) {
    await this.assertOwned(guardianId, memberId);
    return this.prisma.familyMedication.create({
      data: {
        familyMemberId: memberId,
        name: dto.name,
        dose: dto.dose,
        frequency: dto.frequency,
        notes: dto.notes,
      },
    });
  }

  async removeMedication(
    guardianId: string,
    memberId: string,
    medicationId: string,
  ) {
    await this.assertOwned(guardianId, memberId);
    const med = await this.prisma.familyMedication.findUnique({
      where: { id: medicationId },
    });
    if (!med || med.familyMemberId !== memberId) {
      throw new NotFoundException('Medication not found');
    }
    await this.prisma.familyMedication.delete({ where: { id: medicationId } });
  }

  async listReminders(
    guardianId: string,
    memberId: string,
    scope: 'upcoming' | 'all' = 'upcoming',
  ) {
    await this.assertOwned(guardianId, memberId);
    const where: Prisma.ReminderWhereInput = { familyMemberId: memberId };
    if (scope === 'upcoming') {
      where.status = ReminderStatus.PENDING;
    }
    return this.prisma.reminder.findMany({
      where,
      orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
    });
  }

  async createReminder(
    guardianId: string,
    memberId: string,
    dto: CreateFamilyReminderDto,
  ) {
    await this.assertOwned(guardianId, memberId);
    return this.prisma.reminder.create({
      data: {
        userId: guardianId,
        familyMemberId: memberId,
        type: dto.type,
        title: dto.title,
        subtitle: dto.subtitle,
        scheduledAt: new Date(dto.scheduledAt),
        recurrence: dto.recurrence,
      },
    });
  }

  async markReminderDone(
    guardianId: string,
    memberId: string,
    reminderId: string,
  ) {
    await this.assertOwned(guardianId, memberId);
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
    });
    if (!reminder || reminder.familyMemberId !== memberId) {
      throw new NotFoundException('Reminder not found');
    }
    return this.prisma.reminder.update({
      where: { id: reminderId },
      data: { status: ReminderStatus.DONE, completedAt: new Date() },
    });
  }

  private async assertOwned(guardianId: string, memberId: string) {
    const member = await this.prisma.familyMember.findUnique({
      where: { id: memberId },
      select: { guardianId: true },
    });
    if (!member) throw new NotFoundException('Family member not found');
    if (member.guardianId !== guardianId) throw new ForbiddenException();
  }
}
