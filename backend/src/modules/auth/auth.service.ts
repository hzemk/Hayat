import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@prisma-db/prisma.service';
import { InsuranceCardService } from '@modules/insurance-card/insurance-card.service';
import { AuditService } from '@common/audit/audit.service';
import { TokensService } from './tokens.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SanadCallbackDto } from './dto/sanad.dto';

const BCRYPT_ROUNDS = 12;

// Convention: any email whose local-part starts with "dr." is treated as a
// doctor account (role=DOCTOR + auto-provisioned Doctor profile). Lets the
// mobile app demo the doctor portal without a separate signup flow.
function isDoctorEmail(email: string): boolean {
  return /^dr\./i.test(email.trim());
}

// Same convention for hospital administrators: "hosp." prefix → HOSPITAL_ADMIN
// with an auto-link to the first seeded hospital so the portal demo works.
function isHospitalEmail(email: string): boolean {
  return /^hosp\./i.test(email.trim());
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly insuranceCard: InsuranceCardService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private get demoRolesEnabled(): boolean {
    return this.config.get<boolean>('features.enableDemoRoles') === true;
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const isDr = this.demoRolesEnabled && isDoctorEmail(email);
    const isHosp = this.demoRolesEnabled && isHospitalEmail(email);
    const role = isHosp
      ? UserRole.HOSPITAL_ADMIN
      : isDr
        ? UserRole.DOCTOR
        : dto.role ?? UserRole.PATIENT;

    if (role === UserRole.DOCTOR && !isDr && !dto.doctorProfile) {
      throw new BadRequestException(
        'Doctor registration requires license number and specialty',
      );
    }
    if (role === UserRole.ADMIN) {
      throw new BadRequestException('Admin accounts cannot self-register');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    if (role === UserRole.DOCTOR && dto.doctorProfile) {
      const licenseTaken = await this.prisma.doctor.findUnique({
        where: { licenseNumber: dto.doctorProfile.licenseNumber },
      });
      if (licenseTaken) {
        throw new ConflictException('A doctor with this license already exists');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: dto.fullName,
        phoneNumber: dto.phoneNumber ?? null,
        preferredLocale: dto.preferredLocale ?? 'ar',
        authProvider: AuthProvider.LOCAL,
        emailVerified: false,
        role,
        ...(role === UserRole.PATIENT
          ? { medicalRecord: { create: {} } }
          : {}),
        ...(role === UserRole.DOCTOR && dto.doctorProfile
          ? {
              doctor: {
                create: {
                  licenseNumber: dto.doctorProfile.licenseNumber,
                  specialty: dto.doctorProfile.specialty,
                  specialtyAr: dto.doctorProfile.specialtyAr,
                  isAvailable: true,
                },
              },
            }
          : {}),
      },
    });

    if (role === UserRole.DOCTOR && !dto.doctorProfile) {
      await this.ensureDoctorProfile(user.id);
    }
    if (role === UserRole.HOSPITAL_ADMIN) {
      await this.ensureHospitalLink(user.id);
    }

    return this.buildSession(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'This account uses Sanad sign-in. Please continue with Sanad.',
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const withDoctor = await this.promoteIfDoctorEmail(user);
    const withHospital = await this.promoteIfHospitalEmail(withDoctor);
    return this.buildSession(withHospital);
  }

  async sanadCallback(dto: SanadCallbackDto) {
    // TODO: Real Sanad/JoPACC OIDC token exchange.
    // For MVP we accept a signed stub of the form `sanad-mock:<subject>:<email>:<fullName>`
    // so the mobile app can demo the flow end-to-end without a live IdP.
    const identity = this.parseMockSanadCode(dto.code);
    if (!identity) {
      throw new BadRequestException('Invalid Sanad authorization code');
    }

    const email = identity.email.trim().toLowerCase();

    const isDr = this.demoRolesEnabled && isDoctorEmail(email);
    const user = await this.prisma.user.upsert({
      where: { sanadId: identity.subject },
      update: {
        email,
        fullName: identity.fullName,
        emailVerified: true,
        authProvider: AuthProvider.SANAD,
      },
      create: {
        sanadId: identity.subject,
        email,
        fullName: identity.fullName,
        emailVerified: true,
        authProvider: AuthProvider.SANAD,
        preferredLocale: 'ar',
        role: isDr ? UserRole.DOCTOR : UserRole.PATIENT,
        ...(isDr ? {} : { medicalRecord: { create: {} } }),
      },
    });

    if (!isDr) {
      await this.seedSanadMedicalDefaults(user.id);
      try {
        await this.insuranceCard.syncFromSanad(user.id);
      } catch (err) {
        this.logger.warn(
          `Sanad insurance auto-sync failed: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Sanad login for subject=${identity.subject}`);
    const withDoctor = await this.promoteIfDoctorEmail(user);
    const withHospital = await this.promoteIfHospitalEmail(withDoctor);
    return this.buildSession(withHospital);
  }

  async refresh(dto: RefreshDto) {
    const rotated = await this.tokens.rotate(dto.refreshToken);
    if (!rotated) throw new UnauthorizedException('Invalid refresh token');
    return rotated;
  }

  async logout(refreshToken: string) {
    await this.tokens.revoke(refreshToken);
  }

  private async buildSession(user: User) {
    const tokens = await this.tokens.issue(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        authProvider: user.authProvider,
        preferredLocale: user.preferredLocale,
        emailVerified: user.emailVerified,
        defaultDoctorId: user.defaultDoctorId,
        hospitalId: user.hospitalId ?? null,
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
        gender: user.gender,
        isProfileComplete: Boolean(user.fullName && user.dateOfBirth),
      },
      ...tokens,
    };
  }

  private async promoteIfDoctorEmail(user: User): Promise<User> {
    if (!this.demoRolesEnabled || !isDoctorEmail(user.email)) return user;
    const previousRole = user.role;
    const updated =
      previousRole === UserRole.DOCTOR
        ? user
        : await this.prisma.user.update({
            where: { id: user.id },
            data: { role: UserRole.DOCTOR },
          });
    if (previousRole !== UserRole.DOCTOR) {
      void this.audit.record({
        userId: updated.id,
        action: 'user.role.change',
        resource: 'User',
        resourceId: updated.id,
        metadata: { from: previousRole, to: UserRole.DOCTOR, reason: 'email-prefix:dr.' },
      });
    }
    await this.ensureDoctorProfile(updated.id);
    return updated;
  }

  private async promoteIfHospitalEmail(user: User): Promise<User> {
    if (!this.demoRolesEnabled || !isHospitalEmail(user.email)) return user;
    const previousRole = user.role;
    const updated =
      previousRole === UserRole.HOSPITAL_ADMIN
        ? user
        : await this.prisma.user.update({
            where: { id: user.id },
            data: { role: UserRole.HOSPITAL_ADMIN },
          });
    if (previousRole !== UserRole.HOSPITAL_ADMIN) {
      void this.audit.record({
        userId: updated.id,
        action: 'user.role.change',
        resource: 'User',
        resourceId: updated.id,
        metadata: { from: previousRole, to: UserRole.HOSPITAL_ADMIN, reason: 'email-prefix:hosp.' },
      });
    }
    return this.ensureHospitalLink(updated.id);
  }

  private async ensureHospitalLink(userId: string): Promise<User> {
    const current = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (current.hospitalId) return current;

    const hospital = await this.prisma.hospital.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!hospital) {
      this.logger.warn(
        'Cannot link hospital admin: no Hospital rows seeded.',
      );
      return current;
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { hospitalId: hospital.id },
    });
  }

  private async ensureDoctorProfile(userId: string): Promise<void> {
    const existing = await this.prisma.doctor.findUnique({ where: { userId } });
    if (existing) return;

    const department = await this.prisma.department.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    if (!department) {
      this.logger.warn(
        'Cannot auto-create Doctor profile: no Department rows seeded.',
      );
      return;
    }
    await this.prisma.doctor.create({
      data: {
        userId,
        hospitalId: department.hospitalId,
        departmentId: department.id,
        licenseNumber: `AUTO-${userId.slice(0, 8).toUpperCase()}`,
        specialty: 'Internal Medicine',
        specialtyAr: 'الباطنية',
        isAvailable: true,
      },
    });
    this.logger.log(`Auto-provisioned Doctor profile for user ${userId}`);
  }

  // Sanad onboarding seeds a baseline medical profile so the Emergency ID has
  // real data on first login. Idempotent: only fills sections still empty.
  private async seedSanadMedicalDefaults(userId: string) {
    const record = await this.prisma.medicalRecord.upsert({
      where: { userId },
      create: { userId, bloodType: 'O+', heightCm: 175, weightKg: 78 },
      update: {},
      include: {
        allergies: { select: { id: true } },
        conditions: { select: { id: true } },
        medications: { select: { id: true } },
        emergencyContacts: { select: { id: true } },
      },
    });

    if (record.allergies.length === 0) {
      await this.prisma.allergy.createMany({
        data: [
          {
            medicalRecordId: record.id,
            substance: 'Penicillin',
            severity: 'severe',
            reaction: 'Rash, difficulty breathing',
          },
          {
            medicalRecordId: record.id,
            substance: 'Peanuts',
            severity: 'moderate',
            reaction: 'Hives',
          },
        ],
      });
    }

    if (record.conditions.length === 0) {
      await this.prisma.condition.create({
        data: {
          medicalRecordId: record.id,
          name: 'Asthma',
          icdCode: 'J45',
          status: 'controlled',
          notes: 'Mild — uses inhaler as needed',
        },
      });
    }

    if (record.medications.length === 0) {
      await this.prisma.medication.create({
        data: {
          medicalRecordId: record.id,
          name: 'Salbutamol Inhaler',
          dose: '100mcg',
          frequency: 'As needed',
        },
      });
    }

    if (record.emergencyContacts.length === 0) {
      await this.prisma.emergencyContact.create({
        data: {
          medicalRecordId: record.id,
          name: 'Family contact',
          relationship: 'Family',
          phoneNumber: '+962790000000',
        },
      });
    }
  }

  private parseMockSanadCode(
    code: string,
  ): { subject: string; email: string; fullName: string } | null {
    if (!code.startsWith('sanad-mock:')) return null;
    const parts = code.split(':');
    if (parts.length !== 4) return null;
    const [, subject, email, fullName] = parts;
    if (!subject || !email || !fullName) return null;
    return { subject, email, fullName: decodeURIComponent(fullName) };
  }
}
