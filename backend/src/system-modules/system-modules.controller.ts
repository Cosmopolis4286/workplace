import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SystemModulesService } from './system-modules.service';
import { ToggleSystemModuleDto } from './dto/toggle-system-module.dto';

@Controller('system-modules')
@UseGuards(JwtAuthGuard)
export class SystemModulesController {
  constructor(private readonly systemModulesService: SystemModulesService) {}

  /** Lista todos los módulos con su estado global — panel de administración */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  listAll() {
    return this.systemModulesService.listAll();
  }

  /** Activa/desactiva un módulo para TODA la plataforma (kill-switch) */
  @Patch('toggle')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  toggle(
    @Body() dto: ToggleSystemModuleDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.systemModulesService.toggle(dto.module, dto.enabled, user.id);
  }
}
