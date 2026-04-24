import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';
import { PushService } from '@modules/push/push.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  private readonly include = {
    hospital: { select: { id: true, nameAr: true, nameEn: true, city: true } },
    department: { select: { id: true, nameAr: true, nameEn: true } },
    doctor: {
      select: {
        id: true,
        specialty: true,
        specialtyAr: true,
        user: { select: { id: true, fullName: true, email: true } },
      },
    },
    familyMember: {
      select: { id: true, fullName: true, dateOfBirth: true, relationship: true },
    },
  } as const;

  private readonly MIN_BOOKING_AGE_YEARS = 18;

  private ageYearsAt(dateOfBirth: Date, ref: Date = new Date()) {
    let years = ref.getFullYear() - dateOfBirth.getFullYear();
    const m = ref.getMonth() - dateOfBirth.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < dateOfBirth.getDate())) years--;
    return years;
  }

  listMine(userId: string) {
    return this.prisma.appointment.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'desc' },
      include: this.include,
    });
  }

  async create(userId: string, dto: CreateAppointmentDto) {
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt.getTime() < Date.now()) {
      throw new BadRequestException('Appointment must be in the future');
    }

    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department || department.hospitalId !== dto.hospitalId) {
      throw new BadRequestException('Department does not belong to this hospital');
    }

    // Reject bookings outside the department's open hours OR on closed days
    // of the week. ER is always 24/7 and skips this check (treated as open
    // even if openHours is missing). openHours is `DayWindow[]` — one
    // entry per weekday (mon/tue/.../sun) with HH:MM strings, null = closed.
    if (department.code !== 'ER') {
      const window = openWindowFor(department.openHours, scheduledAt);
      if (window) {
        if (!window.open || !window.close) {
          const dayName = WEEKDAY_NAMES_LONG[scheduledAt.getDay()];
          throw new BadRequestException(
            `This department is closed on ${dayName}. Pick another day or choose Emergency (ER) for 24/7 care.`,
          );
        }
        const minutes = scheduledAt.getHours() * 60 + scheduledAt.getMinutes();
        const openMin = parseHHMM(window.open);
        const closeMin = parseHHMM(window.close);
        if (
          openMin === null ||
          closeMin === null ||
          minutes < openMin ||
          minutes >= closeMin
        ) {
          throw new BadRequestException(
            `This department is only open ${window.open}–${window.close}. Pick a time inside that window or choose Emergency (ER) for 24/7 care.`,
          );
        }
      }
    }

    if (dto.doctorId) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: dto.doctorId },
        select: { hospitalId: true, departmentId: true },
      });
      if (!doctor) throw new BadRequestException('Doctor not found');
      if (doctor.hospitalId !== dto.hospitalId) {
        throw new BadRequestException(
          'Doctor does not belong to this hospital',
        );
      }
      if (doctor.departmentId && doctor.departmentId !== dto.departmentId) {
        throw new BadRequestException(
          'Doctor does not belong to this department',
        );
      }
    }

    if (dto.familyMemberId) {
      const member = await this.prisma.familyMember.findUnique({
        where: { id: dto.familyMemberId },
        select: { guardianId: true, dateOfBirth: true, fullName: true },
      });
      if (!member) throw new NotFoundException('Family member not found');
      if (member.guardianId !== userId) throw new ForbiddenException();
      if (this.ageYearsAt(member.dateOfBirth, scheduledAt) >= this.MIN_BOOKING_AGE_YEARS) {
        throw new BadRequestException(
          `${member.fullName} is 18 or older and must book their own appointments`,
        );
      }
    }

    const created = await this.prisma.appointment.create({
      data: {
        userId,
        familyMemberId: dto.familyMemberId,
        hospitalId: dto.hospitalId,
        departmentId: dto.departmentId,
        doctorId: dto.doctorId,
        scheduledAt,
        reason: dto.reason,
      },
      include: this.include,
    });

    const hospitalName = created.hospital?.nameEn ?? 'the hospital';
    const when = created.scheduledAt.toLocaleString();
    void this.push.sendToUser(userId, {
      title: 'Appointment booked',
      body: `${hospitalName} — ${when}`,
      data: { type: 'appointment', appointmentId: created.id },
    });

    return created;
  }

  async cancel(userId: string, appointmentId: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.userId !== userId) throw new ForbiddenException();
    if (appt.status === AppointmentStatus.CANCELLED) return appt;

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
      include: this.include,
    });

    void this.push.sendToUser(userId, {
      title: 'Appointment cancelled',
      body: `${updated.hospital?.nameEn ?? 'Appointment'} on ${updated.scheduledAt.toLocaleString()}`,
      data: { type: 'appointment', appointmentId: updated.id },
    });

    return updated;
  }
}

// JS Date.getDay(): Sunday=0, Monday=1, ..., Saturday=6. Maps to the same
// 3-letter codes the hospital admin portal uses.
const WEEKDAY_CODES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const WEEKDAY_NAMES_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface DayWindow {
  day: string; // 'mon' | 'tue' | ... | 'sun'
  open: string | null; // 'HH:MM'
  close: string | null;
}

// Department.openHours is `Json?` and stored as `DayWindow[]` by the hospital
// admin portal. Returns the entry matching `at`'s weekday, or null if the
// stored value isn't an array (legacy/missing → caller treats as always
// open, except ER which short-circuits earlier).
function openWindowFor(value: unknown, at: Date): DayWindow | null {
  if (!Array.isArray(value)) return null;
  const code = WEEKDAY_CODES[at.getDay()];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const obj = entry as { day?: unknown; open?: unknown; close?: unknown };
    if (obj.day !== code) continue;
    const open = typeof obj.open === 'string' ? obj.open : null;
    const close = typeof obj.close === 'string' ? obj.close : null;
    return { day: code, open, close };
  }
  return null;
}

function parseHHMM(s: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}
