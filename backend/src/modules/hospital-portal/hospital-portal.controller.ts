import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { HospitalPortalService } from './hospital-portal.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { RolesGuard } from '@common/guards/roles.guard';
import { CreateHospitalDoctorDto } from './dto/create-doctor.dto';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
} from './dto/upsert-department.dto';
import { UpsertInsuranceCardDto } from './dto/upsert-insurance-card.dto';

@Controller('hospital-portal')
@UseGuards(RolesGuard)
@Roles(UserRole.HOSPITAL_ADMIN)
export class HospitalPortalController {
  constructor(private readonly service: HospitalPortalService) {}

  @Get('me')
  me(@CurrentUser('userId') userId: string) {
    return this.service.getMyHospital(userId);
  }

  @Get('stats')
  stats(@CurrentUser('userId') userId: string) {
    return this.service.getStats(userId);
  }

  @Get('doctors')
  doctors(@CurrentUser('userId') userId: string) {
    return this.service.listDoctors(userId);
  }

  @Post('doctors')
  createDoctor(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateHospitalDoctorDto,
  ) {
    return this.service.createDoctor(userId, dto);
  }

  @Patch('doctors/:doctorId/availability')
  setDoctorAvailability(
    @CurrentUser('userId') userId: string,
    @Param('doctorId') doctorId: string,
    @Body('isAvailable') isAvailable: boolean,
  ) {
    return this.service.setDoctorAvailability(userId, doctorId, !!isAvailable);
  }

  @Get('departments')
  departments(@CurrentUser('userId') userId: string) {
    return this.service.listDepartments(userId);
  }

  @Post('departments')
  createDepartment(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.service.createDepartment(userId, dto);
  }

  @Get('departments/:departmentId')
  getDepartment(
    @CurrentUser('userId') userId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.service.getDepartment(userId, departmentId);
  }

  @Get('departments/:departmentId/roster')
  getDepartmentRoster(
    @CurrentUser('userId') userId: string,
    @Param('departmentId') departmentId: string,
  ) {
    return this.service.getDepartmentRoster(userId, departmentId);
  }

  @Get('doctors/:doctorId/patients/:patientId/care')
  getPatientCare(
    @CurrentUser('userId') userId: string,
    @Param('doctorId') doctorId: string,
    @Param('patientId') patientId: string,
  ) {
    return this.service.getPatientCare(userId, doctorId, patientId);
  }

  @Patch('departments/:departmentId')
  updateDepartment(
    @CurrentUser('userId') userId: string,
    @Param('departmentId') departmentId: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.service.updateDepartment(userId, departmentId, dto);
  }

  @Get('insurance-cards')
  listInsuranceCards(@CurrentUser('userId') userId: string) {
    return this.service.listInsuranceCards(userId);
  }

  @Put('insurance-cards')
  upsertInsuranceCard(
    @CurrentUser('userId') userId: string,
    @Body() dto: UpsertInsuranceCardDto,
  ) {
    return this.service.upsertInsuranceCard(userId, dto);
  }

  @Delete('insurance-cards/:cardId')
  @HttpCode(204)
  deleteInsuranceCard(
    @CurrentUser('userId') userId: string,
    @Param('cardId') cardId: string,
  ) {
    return this.service.deleteInsuranceCard(userId, cardId);
  }
}
