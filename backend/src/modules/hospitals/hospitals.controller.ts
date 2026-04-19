import { Controller, Get, Param, Query } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitals: HospitalsService) {}

  @Get()
  list(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('city') city?: string,
  ) {
    const latNum = lat ? parseFloat(lat) : undefined;
    const lngNum = lng ? parseFloat(lng) : undefined;
    return this.hospitals.list({ lat: latNum, lng: lngNum, city });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.hospitals.getById(id);
  }

  @Get(':id/departments')
  departments(@Param('id') id: string) {
    return this.hospitals.listDepartments(id);
  }

  @Get(':id/departments/:departmentId/doctors')
  departmentDoctors(
    @Param('id') id: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.hospitals.listDepartmentDoctors(id, departmentId);
  }
}
