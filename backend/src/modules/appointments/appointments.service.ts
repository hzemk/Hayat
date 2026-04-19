import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

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
  } as const;

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

    return this.prisma.appointment.create({
      data: {
        userId,
        hospitalId: dto.hospitalId,
        departmentId: dto.departmentId,
        doctorId: dto.doctorId,
        scheduledAt,
        reason: dto.reason,
      },
      include: this.include,
    });
  }

  async cancel(userId: string, appointmentId: string) {
    const appt = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.userId !== userId) throw new ForbiddenException();
    if (appt.status === AppointmentStatus.CANCELLED) return appt;

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
      include: this.include,
    });
  }
}
