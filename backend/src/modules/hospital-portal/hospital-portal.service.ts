import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AuthProvider,
  DoctorMessageSender,
  InsuranceCardSource,
  Prisma,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@prisma-db/prisma.service';
import { CreateHospitalDoctorDto } from './dto/create-doctor.dto';
import {
  CreateDepartmentDto,
  DayWindowDto,
  UpdateDepartmentDto,
  WEEKDAYS,
} from './dto/upsert-department.dto';
import { UpsertInsuranceCardDto } from './dto/upsert-insurance-card.dto';
import { InsuranceCardService } from '../insurance-card/insurance-card.service';

@Injectable()
export class HospitalPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insuranceCards: InsuranceCardService,
  ) {}

  async getMyHospital(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hospitalId: true },
    });
    if (!user?.hospitalId) {
      throw new ForbiddenException('No hospital linked to this account');
    }
    const hospital = await this.prisma.hospital.findUnique({
      where: { id: user.hospitalId },
      include: {
        departments: {
          orderBy: { nameEn: 'asc' },
        },
      },
    });
    if (!hospital) throw new NotFoundException('Hospital not found');
    return hospital;
  }

  async getStats(userId: string) {
    const { id: hospitalId } = await this.resolveHospital(userId);
    const hospital = await this.prisma.hospital.findUniqueOrThrow({
      where: { id: hospitalId },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        city: true,
        phone: true,
      },
    });

    const [doctors, departments, appointments] = await Promise.all([
      this.prisma.doctor.count({ where: { hospitalId } }),
      this.prisma.department.count({ where: { hospitalId } }),
      this.prisma.appointment.count({
        where: {
          hospitalId,
          status: {
            in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
          },
        },
      }),
    ]);

    const onlineDoctors = await this.prisma.doctor.count({
      where: { hospitalId, isAvailable: true },
    });

    const unreadAgg = await this.prisma.doctorMessage.groupBy({
      by: ['threadId'],
      where: {
        sender: DoctorMessageSender.PATIENT,
        readAt: null,
        thread: { doctor: { hospitalId } },
      },
      _count: { _all: true },
    });
    const unreadMessages = unreadAgg.reduce((n, r) => n + r._count._all, 0);

    return {
      hospital,
      doctors,
      onlineDoctors,
      departments,
      openAppointments: appointments,
      unreadMessages,
    };
  }

  async listDoctors(userId: string) {
    const hospital = await this.resolveHospital(userId);
    const doctors = await this.prisma.doctor.findMany({
      where: { hospitalId: hospital.id },
      orderBy: [{ isAvailable: 'desc' }, { createdAt: 'asc' }],
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        department: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });

    const threadStats = await this.prisma.doctorMessage.groupBy({
      by: ['threadId'],
      where: {
        sender: DoctorMessageSender.PATIENT,
        readAt: null,
        thread: { doctor: { hospitalId: hospital.id } },
      },
      _count: { _all: true },
    });

    const threadsByDoctor = await this.prisma.doctorThread.findMany({
      where: { doctor: { hospitalId: hospital.id } },
      select: { id: true, doctorId: true },
    });

    const unreadById = new Map(
      threadStats.map((r) => [r.threadId, r._count._all]),
    );
    const unreadByDoctor = new Map<string, number>();
    const threadsByDoctorCount = new Map<string, number>();
    for (const t of threadsByDoctor) {
      threadsByDoctorCount.set(
        t.doctorId,
        (threadsByDoctorCount.get(t.doctorId) ?? 0) + 1,
      );
      const unread = unreadById.get(t.id);
      if (unread) {
        unreadByDoctor.set(
          t.doctorId,
          (unreadByDoctor.get(t.doctorId) ?? 0) + unread,
        );
      }
    }

    return doctors.map((d) => ({
      id: d.id,
      licenseNumber: d.licenseNumber,
      specialty: d.specialty,
      specialtyAr: d.specialtyAr,
      rating: d.rating,
      isAvailable: d.isAvailable,
      yearsExperience: d.yearsExperience,
      photoUrl: d.photoUrl,
      languages: d.languages,
      user: d.user,
      department: d.department,
      threadCount: threadsByDoctorCount.get(d.id) ?? 0,
      unreadMessages: unreadByDoctor.get(d.id) ?? 0,
    }));
  }

  async setDoctorAvailability(
    userId: string,
    doctorId: string,
    isAvailable: boolean,
  ) {
    const hospital = await this.resolveHospital(userId);
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!doctor || doctor.hospitalId !== hospital.id) {
      throw new NotFoundException('Doctor not found in this hospital');
    }
    return this.prisma.doctor.update({
      where: { id: doctorId },
      data: { isAvailable },
    });
  }

  async listDepartments(userId: string) {
    const hospital = await this.resolveHospital(userId);
    const departments = await this.prisma.department.findMany({
      where: { hospitalId: hospital.id },
      orderBy: { nameEn: 'asc' },
      include: {
        doctors: { select: { id: true, isAvailable: true } },
      },
    });
    return departments.map((d) => ({
      id: d.id,
      code: d.code,
      nameAr: d.nameAr,
      nameEn: d.nameEn,
      doctorCount: d.doctors.length,
      onlineCount: d.doctors.filter((x) => x.isAvailable).length,
    }));
  }

  async getDepartment(userId: string, departmentId: string) {
    const hospital = await this.resolveHospital(userId);
    const dept = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        doctors: {
          orderBy: [{ isAvailable: 'desc' }, { createdAt: 'asc' }],
          include: {
            user: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
      },
    });
    if (!dept || dept.hospitalId !== hospital.id) {
      throw new NotFoundException('Department not found');
    }
    return {
      id: dept.id,
      code: dept.code,
      nameAr: dept.nameAr,
      nameEn: dept.nameEn,
      openHours: normalizeOpenHours(dept.openHours),
      doctors: dept.doctors.map((d) => ({
        id: d.id,
        specialty: d.specialty,
        specialtyAr: d.specialtyAr,
        isAvailable: d.isAvailable,
        photoUrl: d.photoUrl,
        user: d.user,
      })),
    };
  }

  async createDepartment(userId: string, dto: CreateDepartmentDto) {
    const hospital = await this.resolveHospital(userId);
    const code = dto.code?.trim() || codeFromName(dto.nameEn);
    if (!code) {
      throw new BadRequestException('Could not derive department code');
    }
    try {
      const dept = await this.prisma.department.create({
        data: {
          hospitalId: hospital.id,
          nameAr: dto.nameAr.trim(),
          nameEn: dto.nameEn.trim(),
          code,
          openHours: dto.openHours
            ? (windowsToJson(dto.openHours) as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
      return {
        id: dept.id,
        code: dept.code,
        nameAr: dept.nameAr,
        nameEn: dept.nameEn,
        openHours: normalizeOpenHours(dept.openHours),
        doctorCount: 0,
        onlineCount: 0,
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A department with this code already exists',
        );
      }
      throw err;
    }
  }

  async updateDepartment(
    userId: string,
    departmentId: string,
    dto: UpdateDepartmentDto,
  ) {
    const hospital = await this.resolveHospital(userId);
    const existing = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { hospitalId: true },
    });
    if (!existing || existing.hospitalId !== hospital.id) {
      throw new NotFoundException('Department not found');
    }
    const data: Prisma.DepartmentUpdateInput = {};
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr.trim();
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn.trim();
    if (dto.openHours !== undefined) {
      data.openHours = windowsToJson(dto.openHours) as Prisma.InputJsonValue;
    }
    await this.prisma.department.update({
      where: { id: departmentId },
      data,
    });
    return this.getDepartment(userId, departmentId);
  }

  async createDoctor(userId: string, dto: CreateHospitalDoctorDto) {
    const hospital = await this.resolveHospital(userId);
    const email = dto.email.trim().toLowerCase();

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
        select: { hospitalId: true },
      });
      if (!dept || dept.hospitalId !== hospital.id) {
        throw new BadRequestException('Department not in this hospital');
      }
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }
    const existingLicense = await this.prisma.doctor.findUnique({
      where: { licenseNumber: dto.licenseNumber.trim() },
    });
    if (existingLicense) {
      throw new ConflictException('License number already registered');
    }

    const password = dto.password ?? 'doctor1234';
    const passwordHash = await bcrypt.hash(password, 12);

    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName.trim(),
        phoneNumber: dto.phoneNumber?.trim() || null,
        preferredLocale: 'ar',
        authProvider: AuthProvider.LOCAL,
        emailVerified: true,
        role: UserRole.DOCTOR,
        doctor: {
          create: {
            hospitalId: hospital.id,
            departmentId: dto.departmentId ?? null,
            licenseNumber: dto.licenseNumber.trim(),
            specialty: dto.specialty.trim(),
            specialtyAr: dto.specialtyAr?.trim() || null,
            yearsExperience: dto.yearsExperience ?? null,
            languages: dto.languages ?? [],
            isAvailable: true,
          },
        },
      },
      include: { doctor: true },
    });

    return {
      id: created.doctor!.id,
      userId: created.id,
      email: created.email,
      fullName: created.fullName,
      tempPassword: dto.password ? null : password,
    };
  }

  async listInsuranceCards(userId: string) {
    const hospital = await this.resolveHospital(userId);
    return this.prisma.insuranceCard.findMany({
      where: { issuedByHospitalId: hospital.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { id: true, fullName: true, email: true, phoneNumber: true },
        },
      },
    });
  }

  async upsertInsuranceCard(userId: string, dto: UpsertInsuranceCardDto) {
    const hospital = await this.resolveHospital(userId);
    const targetUser = await this.resolveTargetPatient(dto);
    return this.insuranceCards.upsertCard({
      userId: targetUser.id,
      provider: dto.provider,
      providerAr: dto.providerAr,
      memberNumber: dto.memberNumber,
      nationalId: dto.nationalId,
      holderName: dto.holderName,
      coverageType: dto.coverageType,
      coverageScope: dto.coverageScope,
      validFrom: new Date(dto.validFrom),
      validUntil: new Date(dto.validUntil),
      photoUrl: dto.photoUrl,
      source: InsuranceCardSource.HOSPITAL,
      issuedByHospitalId: hospital.id,
    });
  }

  async deleteInsuranceCard(userId: string, cardId: string) {
    const hospital = await this.resolveHospital(userId);
    const card = await this.prisma.insuranceCard.findUnique({
      where: { id: cardId },
    });
    if (!card || card.issuedByHospitalId !== hospital.id) {
      throw new NotFoundException('Insurance card not found');
    }
    await this.prisma.insuranceCard.delete({ where: { id: cardId } });
  }

  private async resolveTargetPatient(dto: UpsertInsuranceCardDto) {
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
        select: { id: true, role: true },
      });
      if (!user) throw new NotFoundException('Patient not found');
      return user;
    }
    if (dto.userEmail) {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.userEmail.trim().toLowerCase() },
        select: { id: true, role: true },
      });
      if (!user) throw new NotFoundException('Patient not found');
      return user;
    }
    throw new BadRequestException('userId or userEmail is required');
  }

  private async resolveHospital(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hospitalId: true },
    });
    if (!user?.hospitalId) {
      throw new ForbiddenException('No hospital linked to this account');
    }
    return { id: user.hospitalId };
  }
}

type DayWindow = { day: string; open: string | null; close: string | null };

function normalizeOpenHours(value: Prisma.JsonValue | null): DayWindow[] {
  const map = new Map<string, DayWindow>();
  for (const day of WEEKDAYS) {
    map.set(day, { day, open: null, close: null });
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== 'object') continue;
      const obj = entry as Record<string, unknown>;
      const day = typeof obj.day === 'string' ? obj.day : null;
      if (!day || !map.has(day)) continue;
      const open = typeof obj.open === 'string' ? obj.open : null;
      const close = typeof obj.close === 'string' ? obj.close : null;
      map.set(day, { day, open, close });
    }
  }
  return WEEKDAYS.map((d) => map.get(d)!);
}

function windowsToJson(windows: DayWindowDto[]): DayWindow[] {
  const seen = new Set<string>();
  const out: DayWindow[] = [];
  for (const w of windows) {
    if (seen.has(w.day)) continue;
    seen.add(w.day);
    out.push({
      day: w.day,
      open: w.open ?? null,
      close: w.close ?? null,
    });
  }
  return out;
}

function codeFromName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}
