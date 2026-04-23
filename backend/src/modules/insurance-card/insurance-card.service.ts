import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InsuranceCardSource,
  InsuranceCoverageScope,
  InsuranceCoverageType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@prisma-db/prisma.service';
import { AuditService } from '@common/audit/audit.service';
import {
  fetchSanadInsuranceCard,
  SanadInsuranceCard,
} from './sanad-insurance-mock';

export type UpsertInsuranceCardInput = {
  userId: string;
  provider: string;
  providerAr?: string | null;
  memberNumber: string;
  nationalId: string;
  holderName: string;
  coverageType: InsuranceCoverageType;
  coverageScope: InsuranceCoverageScope;
  validFrom: Date;
  validUntil: Date;
  photoUrl?: string | null;
  source: InsuranceCardSource;
  issuedByHospitalId?: string | null;
};

@Injectable()
export class InsuranceCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getMine(userId: string) {
    const card = await this.prisma.insuranceCard.findUnique({
      where: { userId },
      include: {
        issuedByHospital: {
          select: { id: true, nameAr: true, nameEn: true },
        },
      },
    });
    return card;
  }

  async syncFromSanad(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, sanadId: true, fullName: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const seed = user.sanadId ?? user.id;
    const sanadCard: SanadInsuranceCard = fetchSanadInsuranceCard(
      seed,
      user.fullName ?? 'Patient',
    );

    return this.upsertCard({
      userId,
      provider: sanadCard.provider,
      providerAr: sanadCard.providerAr,
      memberNumber: sanadCard.memberNumber,
      nationalId: sanadCard.nationalId,
      holderName: sanadCard.holderName,
      coverageType: sanadCard.coverageType,
      coverageScope: sanadCard.coverageScope,
      validFrom: new Date(sanadCard.validFrom),
      validUntil: new Date(sanadCard.validUntil),
      photoUrl: sanadCard.photoUrl,
      source: InsuranceCardSource.SANAD,
      issuedByHospitalId: null,
    });
  }

  async upsertCard(input: UpsertInsuranceCardInput) {
    const data = {
      provider: input.provider.trim(),
      providerAr: input.providerAr?.trim() || null,
      memberNumber: input.memberNumber.trim(),
      nationalId: input.nationalId.trim(),
      holderName: input.holderName.trim(),
      coverageType: input.coverageType,
      coverageScope: input.coverageScope,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      photoUrl: input.photoUrl?.trim() || null,
      source: input.source,
      issuedByHospitalId: input.issuedByHospitalId ?? null,
    };
    try {
      const existing = await this.prisma.insuranceCard.findUnique({
        where: { userId: input.userId },
        select: { id: true },
      });
      const card = await this.prisma.insuranceCard.upsert({
        where: { userId: input.userId },
        create: { userId: input.userId, ...data },
        update: data,
        include: {
          issuedByHospital: {
            select: { id: true, nameAr: true, nameEn: true },
          },
        },
      });
      void this.audit.record({
        userId: input.userId,
        action: existing ? 'insuranceCard.update' : 'insuranceCard.create',
        resource: 'InsuranceCard',
        resourceId: card.id,
        metadata: {
          source: input.source,
          coverageType: input.coverageType,
          coverageScope: input.coverageScope,
        },
      });
      return card;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Member number already exists');
      }
      throw err;
    }
  }

  async deleteCard(userId: string) {
    const existing = await this.prisma.insuranceCard.findUnique({
      where: { userId },
    });
    if (!existing) throw new NotFoundException('Insurance card not found');
    await this.prisma.insuranceCard.delete({ where: { userId } });
  }
}
