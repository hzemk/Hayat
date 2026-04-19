import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@prisma-db/prisma.service';

interface ListParams {
  lat?: number;
  lng?: number;
  city?: string;
}

@Injectable()
export class HospitalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ lat, lng, city }: ListParams) {
    const hospitals = await this.prisma.hospital.findMany({
      where: city ? { city: { equals: city, mode: 'insensitive' } } : undefined,
      include: { departments: { select: { id: true, nameAr: true, nameEn: true, code: true } } },
    });

    if (lat === undefined || lng === undefined) return hospitals;

    return hospitals
      .map((h) => ({
        ...h,
        distanceKm: haversine(lat, lng, h.latitude, h.longitude),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async getById(id: string) {
    const h = await this.prisma.hospital.findUnique({
      where: { id },
      include: { departments: true },
    });
    if (!h) throw new NotFoundException('Hospital not found');
    return h;
  }

  async listDepartments(hospitalId: string) {
    return this.prisma.department.findMany({
      where: { hospitalId },
      orderBy: { nameAr: 'asc' },
    });
  }

  async listDepartmentDoctors(hospitalId: string, departmentId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { hospitalId: true },
    });
    if (!department || department.hospitalId !== hospitalId) {
      throw new NotFoundException('Department not found');
    }

    const doctors = await this.prisma.doctor.findMany({
      where: { hospitalId, departmentId },
      orderBy: [{ isAvailable: 'desc' }, { rating: 'desc' }],
      select: {
        id: true,
        specialty: true,
        specialtyAr: true,
        bio: true,
        isAvailable: true,
        rating: true,
        yearsExperience: true,
        user: { select: { id: true, fullName: true, email: true } },
      },
    });

    return doctors;
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
