import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-db/prisma.service';
import { CreateVaccinationDto } from './dto/create-vaccination.dto';

@Injectable()
export class VaccinationsService {
  constructor(private readonly prisma: PrismaService) {}

  listMine(userId: string) {
    return this.prisma.vaccination.findMany({
      where: { userId },
      orderBy: { dateGiven: 'desc' },
    });
  }

  async getById(userId: string, id: string) {
    const vx = await this.prisma.vaccination.findUnique({ where: { id } });
    if (!vx) throw new NotFoundException('Vaccination not found');
    if (vx.userId !== userId) throw new ForbiddenException();
    return vx;
  }

  create(userId: string, dto: CreateVaccinationDto) {
    return this.prisma.vaccination.create({
      data: {
        userId,
        name: dto.name,
        manufacturer: dto.manufacturer,
        doseNumber: dto.doseNumber,
        totalDoses: dto.totalDoses,
        dateGiven: new Date(dto.dateGiven),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        batchNumber: dto.batchNumber,
        administeredBy: dto.administeredBy,
        administeredAt: dto.administeredAt,
        certificateNumber: dto.certificateNumber,
        notes: dto.notes,
      },
    });
  }

  async remove(userId: string, id: string) {
    const vx = await this.prisma.vaccination.findUnique({ where: { id } });
    if (!vx) throw new NotFoundException('Vaccination not found');
    if (vx.userId !== userId) throw new ForbiddenException();
    await this.prisma.vaccination.delete({ where: { id } });
  }
}
