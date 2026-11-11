import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PlatformSettingsService } from './platform-settings.service';

@Controller('platform-settings')
export class PlatformSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  // Público: el frontend necesita algunos ajustes sin sesión.
  @Get('public')
  getPublic() {
    return this.settings.getAll(true);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  getAll() {
    return this.settings.getAll();
  }

  @Patch(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPERADMIN)
  set(
    @Param('key') key: string,
    @Body('value') value: unknown,
    @CurrentUser() user: { id: string }
  ) {
    return this.settings.set(key, value, user.id);
  }
}
