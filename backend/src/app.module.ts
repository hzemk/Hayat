import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnv } from './config/validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AiModule } from './modules/ai/ai.module';
import { HospitalsModule } from './modules/hospitals/hospitals.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { SosContactsModule } from './modules/sos-contacts/sos-contacts.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { FamilyModule } from './modules/family/family.module';
import { VaccinationsModule } from './modules/vaccinations/vaccinations.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { DoctorPortalModule } from './modules/doctor-portal/doctor-portal.module';
import { HospitalPortalModule } from './modules/hospital-portal/hospital-portal.module';
import { InsuranceCardModule } from './modules/insurance-card/insurance-card.module';
import { PushModule } from './modules/push/push.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    PushModule,
    AuthModule,
    UsersModule,
    AiModule,
    HospitalsModule,
    AppointmentsModule,
    PrescriptionsModule,
    MedicalRecordsModule,
    EmergencyModule,
    SosContactsModule,
    RemindersModule,
    FamilyModule,
    VaccinationsModule,
    DoctorsModule,
    DoctorPortalModule,
    HospitalPortalModule,
    InsuranceCardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
