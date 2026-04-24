import { Injectable, NotFoundException } from '@nestjs/common';
import { ReminderStatus } from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';

const reminderInclude = {
  prescription: {
    include: {
      doctor: {
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
      items: {
        select: {
          id: true,
          medicationName: true,
          dose: true,
          frequency: true,
          durationDays: true,
          instructionsAr: true,
          instructionsEn: true,
        },
      },
    },
  },
} as const;

type RawReminder = Awaited<
  ReturnType<PrismaService['reminder']['findFirstOrThrow']>
> & {
  prescription:
    | ({
        doctor:
          | ({
              user: { id: string; fullName: string | null; email: string };
            } & Record<string, unknown>)
          | null;
        items: {
          id: string;
          medicationName: string;
          dose: string | null;
          frequency: string | null;
          durationDays: number | null;
          instructionsAr: string | null;
          instructionsEn: string | null;
        }[];
      } & Record<string, unknown>)
    | null;
};

function serialize(r: RawReminder) {
  const rx = r.prescription;
  const doctor = rx?.doctor
    ? {
        id: rx.doctor.id as string,
        specialty: (rx.doctor.specialty as string) ?? null,
        specialtyAr: (rx.doctor.specialtyAr as string | null) ?? null,
        photoUrl: (rx.doctor.photoUrl as string | null) ?? null,
        fullName: rx.doctor.user.fullName,
        email: rx.doctor.user.email,
      }
    : null;

  return {
    id: r.id,
    type: r.type,
    title: r.title,
    subtitle: r.subtitle,
    scheduledAt: r.scheduledAt,
    endsAt: r.endsAt,
    recurrence: r.recurrence,
    status: r.status,
    source: r.source,
    completedAt: r.completedAt,
    prescriptionId: r.prescriptionId,
    doctor,
    prescription: rx
      ? {
          id: rx.id as string,
          issuedAt: rx.issuedAt as Date,
          expiresAt: (rx.expiresAt as Date | null) ?? null,
          notes: (rx.notes as string | null) ?? null,
          items: rx.items,
        }
      : null,
  };
}

@Injectable()
export class RemindersService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string) {
    const rows = await this.prisma.reminder.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { scheduledAt: 'asc' }],
      include: reminderInclude,
    });
    return rows.map((r) => serialize(r as RawReminder));
  }

  async listUpcoming(userId: string, limit = 5) {
    const now = new Date();
    const rows = await this.prisma.reminder.findMany({
      where: {
        userId,
        status: ReminderStatus.PENDING,
        scheduledAt: { gt: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
      include: reminderInclude,
    });
    return rows.map((r) => serialize(r as RawReminder));
  }

  async getOne(userId: string, reminderId: string) {
    const row = await this.prisma.reminder.findFirst({
      where: { id: reminderId, userId },
      include: reminderInclude,
    });
    if (!row) throw new NotFoundException('Reminder not found');
    return serialize(row as RawReminder);
  }
}
