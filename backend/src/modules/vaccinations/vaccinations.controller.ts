import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { VaccinationsService } from './vaccinations.service';
import { VaccineCertShareService } from './vaccine-cert-share.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';

// Patient-facing vaccinations are read-only — only doctors can create them
// (via the doctor portal) and the patient cannot delete their own records
// since they're medical history.
@Controller('vaccinations')
export class VaccinationsController {
  constructor(
    private readonly vaccinations: VaccinationsService,
    private readonly share: VaccineCertShareService,
  ) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.vaccinations.listMine(userId);
  }

  @Get(':id')
  get(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.vaccinations.getById(userId, id);
  }

  // Mints a 24h-scoped token the patient embeds in a QR code. Anyone with
  // the resulting URL can view the public HTML certificate at /v/:token.
  @Post(':id/share-token')
  @HttpCode(201)
  async createShareToken(
    @CurrentUser('userId') userId: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    // Reuses the existing service to enforce ownership before signing.
    await this.vaccinations.getById(userId, id);
    const { token, expiresAt } = await this.share.sign(id, userId);
    return { token, expiresAt, path: `v/${token}` };
  }
}
