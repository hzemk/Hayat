import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SosContactsService } from './sos-contacts.service';
import { CreateSosContactDto } from './dto/create-sos-contact.dto';
import { UpdateSosContactDto } from './dto/update-sos-contact.dto';
import { CurrentUser } from '@common/decorators/current-user.decorator';

@Controller('sos-contacts')
export class SosContactsController {
  constructor(private readonly sos: SosContactsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.sos.listMine(userId);
  }

  @Post()
  create(
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateSosContactDto,
  ) {
    return this.sos.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSosContactDto,
  ) {
    return this.sos.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.sos.remove(userId, id);
  }
}
