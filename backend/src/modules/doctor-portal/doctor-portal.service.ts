import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DoctorMessageKind,
  DoctorMessageSender,
  Prisma,
  PrescriptionStatus,
  ReminderSource,
} from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';
import { PushService } from '@modules/push/push.service';
import { DoctorSendMessageDto } from './dto/doctor-send-message.dto';
import { IssuePrescriptionDto } from './dto/issue-prescription.dto';
import { CreateDoctorReminderDto } from './dto/create-doctor-reminder.dto';
import { buildPrescriptionReminders } from './rx-reminders';

@Injectable()
export class DoctorPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  async getMyDoctorProfile(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            preferredLocale: true,
          },
        },
        hospital: { select: { id: true, nameAr: true, nameEn: true } },
        department: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found for this user');
    }
    return doctor;
  }

  async updateAvailability(userId: string, isAvailable: boolean) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    await this.prisma.doctor.update({
      where: { id: doctor.id },
      data: { isAvailable },
    });
    return this.getMyDoctorProfile(userId);
  }

  async getMySchedule(userId: string) {
    const doctor = await this.resolveDoctor(userId);
    return this.prisma.doctorAvailability.findMany({
      where: { doctorId: doctor.id },
      orderBy: { dayOfWeek: 'asc' },
    });
  }

  async setMySchedule(
    userId: string,
    days: Array<{
      dayOfWeek: number;
      startMinutes: number;
      endMinutes: number;
      isActive: boolean;
    }>,
  ) {
    const doctor = await this.resolveDoctor(userId);
    for (const d of days) {
      if (d.endMinutes <= d.startMinutes) {
        throw new ForbiddenException(
          `Day ${d.dayOfWeek}: endMinutes must be after startMinutes`,
        );
      }
    }
    // Seen days get upserted; unseen days are deleted (so the doctor can clear a day).
    const seenDays = new Set(days.map((d) => d.dayOfWeek));
    await this.prisma.$transaction([
      this.prisma.doctorAvailability.deleteMany({
        where: {
          doctorId: doctor.id,
          dayOfWeek: { notIn: Array.from(seenDays) },
        },
      }),
      ...days.map((d) =>
        this.prisma.doctorAvailability.upsert({
          where: {
            doctorId_dayOfWeek: {
              doctorId: doctor.id,
              dayOfWeek: d.dayOfWeek,
            },
          },
          create: {
            doctorId: doctor.id,
            dayOfWeek: d.dayOfWeek,
            startMinutes: d.startMinutes,
            endMinutes: d.endMinutes,
            isActive: d.isActive,
          },
          update: {
            startMinutes: d.startMinutes,
            endMinutes: d.endMinutes,
            isActive: d.isActive,
          },
        }),
      ),
    ]);
    return this.getMySchedule(userId);
  }

  async listPatients(userId: string) {
    const doctor = await this.resolveDoctor(userId);
    const threads = await this.prisma.doctorThread.findMany({
      where: { doctorId: doctor.id },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            dateOfBirth: true,
            gender: true,
          },
        },
      },
    });

    const unreadCounts = await this.prisma.doctorMessage.groupBy({
      by: ['threadId'],
      where: {
        thread: { doctorId: doctor.id },
        sender: DoctorMessageSender.PATIENT,
        readAt: null,
      },
      _count: { _all: true },
    });
    const unreadMap = new Map(
      unreadCounts.map((u) => [u.threadId, u._count._all]),
    );

    return threads.map((t) => ({
      threadId: t.id,
      lastMessageAt: t.lastMessageAt,
      unread: unreadMap.get(t.id) ?? 0,
      patient: t.patient,
    }));
  }

  async getPatient(userId: string, patientId: string) {
    const doctor = await this.resolveDoctor(userId);
    await this.assertPatientOfDoctor(doctor.id, patientId);

    const patient = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        dateOfBirth: true,
        gender: true,
        preferredLocale: true,
        medicalRecord: {
          include: {
            conditions: { orderBy: { createdAt: 'desc' } },
            medications: { orderBy: { createdAt: 'desc' } },
            allergies: { orderBy: { createdAt: 'desc' } },
            emergencyContacts: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async listThreads(userId: string) {
    const doctor = await this.resolveDoctor(userId);
    const threads = await this.prisma.doctorThread.findMany({
      where: { doctorId: doctor.id },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        patient: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const unread = await this.prisma.doctorMessage.groupBy({
      by: ['threadId'],
      where: {
        thread: { doctorId: doctor.id },
        sender: DoctorMessageSender.PATIENT,
        readAt: null,
      },
      _count: { _all: true },
    });
    const unreadMap = new Map(unread.map((u) => [u.threadId, u._count._all]));

    return threads.map((t) => ({
      id: t.id,
      patient: t.patient,
      lastMessage: t.messages[0] ?? null,
      lastMessageAt: t.lastMessageAt,
      unread: unreadMap.get(t.id) ?? 0,
    }));
  }

  async listMessages(userId: string, patientId: string) {
    const doctor = await this.resolveDoctor(userId);
    const thread = await this.resolveThread(doctor.id, patientId);

    const messages = await this.prisma.doctorMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: 'asc' },
    });

    await this.prisma.doctorMessage.updateMany({
      where: {
        threadId: thread.id,
        sender: DoctorMessageSender.PATIENT,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { thread, messages };
  }

  async sendMessage(
    userId: string,
    patientId: string,
    dto: DoctorSendMessageDto,
  ) {
    const doctor = await this.resolveDoctor(userId);
    const thread = await this.resolveThread(doctor.id, patientId);

    const message = await this.prisma.doctorMessage.create({
      data: {
        threadId: thread.id,
        sender: DoctorMessageSender.DOCTOR,
        kind: dto.kind ?? DoctorMessageKind.TEXT,
        body: dto.body,
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
    await this.prisma.doctorThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    void this.push
      .sendToUser(patientId, {
        title: 'Doctor',
        body: dto.body.length > 140 ? dto.body.slice(0, 139) + '…' : dto.body,
        data: { type: 'doctor-thread', doctorId: doctor.id },
      })
      .catch(() => undefined);

    return message;
  }

  async issuePrescription(userId: string, dto: IssuePrescriptionDto) {
    const doctor = await this.resolveDoctor(userId);
    await this.assertPatientOfDoctor(doctor.id, dto.patientId);

    const prescription = await this.prisma.prescription.create({
      data: {
        patientId: dto.patientId,
        doctorUserId: userId,
        doctorId: doctor.id,
        status: PrescriptionStatus.ACTIVE,
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            medicationName: i.medicationName,
            dose: i.dose,
            frequency: i.frequency,
            durationDays: i.durationDays,
            instructionsAr: i.instructionsAr,
            instructionsEn: i.instructionsEn,
          })),
        },
      },
      include: {
        items: true,
        doctorUser: { select: { fullName: true } },
      },
    });

    // Post RX_ISSUED into the chat thread so the patient sees it inline.
    const thread = await this.resolveThread(doctor.id, dto.patientId);
    const summary = prescription.items
      .map((i) => `${i.medicationName} — ${i.dose} · ${i.frequency}`)
      .join('\n');

    await this.prisma.doctorMessage.create({
      data: {
        threadId: thread.id,
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.RX_ISSUED,
        body: summary,
        metadata: {
          prescriptionId: prescription.id,
          itemCount: prescription.items.length,
        } as Prisma.InputJsonValue,
      },
    });
    await this.prisma.doctorThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    void this.push
      .sendToUser(dto.patientId, {
        title: 'Prescription issued',
        body: `${prescription.items.length} medication${
          prescription.items.length === 1 ? '' : 's'
        } added to your record`,
        data: { type: 'prescription', prescriptionId: prescription.id },
      })
      .catch(() => undefined);

    // Auto-generate medication reminders for the patient across the duration
    // of each item, based on its frequency. Best-effort — failures are logged
    // but don't block the prescription itself.
    try {
      const rows = buildPrescriptionReminders(dto.patientId, prescription.items);
      if (rows.length) {
        await this.prisma.reminder.createMany({ data: rows });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to auto-create reminders for prescription', err);
    }

    return prescription;
  }

  async listIssued(userId: string) {
    await this.resolveDoctor(userId);
    return this.prisma.prescription.findMany({
      where: { doctorUserId: userId },
      orderBy: { issuedAt: 'desc' },
      include: {
        items: true,
        patient: { select: { id: true, fullName: true } },
      },
    });
  }

  async listPatientReminders(userId: string, patientId: string) {
    const doctor = await this.resolveDoctor(userId);
    await this.assertPatientOfDoctor(doctor.id, patientId);
    return this.prisma.reminder.findMany({
      where: { userId: patientId },
      orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
    });
  }

  async createPatientReminder(
    userId: string,
    patientId: string,
    dto: CreateDoctorReminderDto,
  ) {
    const doctor = await this.resolveDoctor(userId);
    await this.assertPatientOfDoctor(doctor.id, patientId);
    const scheduledAt = new Date(dto.scheduledAt);
    const endsAt =
      dto.durationDays && dto.durationDays > 0
        ? new Date(
            scheduledAt.getTime() + dto.durationDays * 24 * 60 * 60 * 1000,
          )
        : null;
    const reminder = await this.prisma.reminder.create({
      data: {
        userId: patientId,
        type: dto.type,
        title: dto.title,
        subtitle: dto.subtitle,
        scheduledAt,
        endsAt,
        recurrence: dto.recurrence,
        source: ReminderSource.DOCTOR,
      },
    });

    // Post a chat message so the reminder is visible in the thread too.
    const thread = await this.resolveThread(doctor.id, patientId);
    const bodyLines = [`⏰ ${reminder.title}`];
    if (reminder.subtitle) bodyLines.push(reminder.subtitle);
    bodyLines.push(reminder.scheduledAt.toISOString());
    if (reminder.endsAt) {
      bodyLines.push(`→ ${reminder.endsAt.toISOString()}`);
    }
    await this.prisma.doctorMessage.create({
      data: {
        threadId: thread.id,
        sender: DoctorMessageSender.DOCTOR,
        kind: DoctorMessageKind.TEXT,
        body: bodyLines.join('\n'),
        metadata: {
          reminderId: reminder.id,
          type: reminder.type,
          scheduledAt: reminder.scheduledAt.toISOString(),
          endsAt: reminder.endsAt?.toISOString() ?? null,
        } as Prisma.InputJsonValue,
      },
    });
    await this.prisma.doctorThread.update({
      where: { id: thread.id },
      data: { lastMessageAt: new Date() },
    });

    return reminder;
  }

  async deletePatientReminder(
    userId: string,
    patientId: string,
    reminderId: string,
  ) {
    const doctor = await this.resolveDoctor(userId);
    await this.assertPatientOfDoctor(doctor.id, patientId);
    const reminder = await this.prisma.reminder.findUnique({
      where: { id: reminderId },
    });
    if (!reminder || reminder.userId !== patientId) {
      throw new NotFoundException('Reminder not found');
    }
    if (reminder.source === ReminderSource.PRESCRIPTION) {
      throw new ForbiddenException(
        'Prescription-linked reminders are regenerated automatically.',
      );
    }
    await this.prisma.reminder.delete({ where: { id: reminderId } });
  }

  private async resolveDoctor(userId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId } });
    if (!doctor) {
      throw new ForbiddenException('No doctor profile linked to this account');
    }
    return doctor;
  }

  private async resolveThread(doctorId: string, patientId: string) {
    const thread = await this.prisma.doctorThread.findUnique({
      where: { patientId_doctorId: { patientId, doctorId } },
    });
    if (!thread) {
      throw new NotFoundException('No conversation with this patient yet');
    }
    return thread;
  }

  private async assertPatientOfDoctor(doctorId: string, patientId: string) {
    const thread = await this.prisma.doctorThread.findUnique({
      where: { patientId_doctorId: { patientId, doctorId } },
    });
    if (thread) return;
    const user = await this.prisma.user.findUnique({
      where: { id: patientId },
      select: { defaultDoctorId: true },
    });
    if (user?.defaultDoctorId === doctorId) return;
    throw new ForbiddenException('This patient is not connected with you');
  }
}
