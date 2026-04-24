import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@prisma-db/prisma.service';

const include = {
  administeredByDoctor: {
    include: {
      user: { select: { fullName: true, email: true } },
    },
  },
  administeredAtHospital: {
    select: { id: true, nameAr: true, nameEn: true, city: true, phone: true },
  },
} as const;

@Injectable()
export class VaccinationsService {
  constructor(private readonly prisma: PrismaService) {}

  listMine(userId: string) {
    return this.prisma.vaccination.findMany({
      where: { userId },
      orderBy: { dateGiven: 'desc' },
      include,
    });
  }

  async getById(userId: string, id: string) {
    const vx = await this.prisma.vaccination.findUnique({
      where: { id },
      include,
    });
    if (!vx) throw new NotFoundException('Vaccination not found');
    if (vx.userId !== userId) throw new ForbiddenException();
    return vx;
  }
}
