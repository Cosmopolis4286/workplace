import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SystemModulesService } from './system-modules.service';
import { ToggleSystemModuleDto } from './dto/toggle-system-module.dto';
import { CreateSystemModuleDto } from './dto/create-system-module.dto';
import { UpdateSystemModuleDto } from './dto/update-system-module.dto';

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

  /** Alta de un módulo nuevo en el catálogo — gerenciable sin tocar código */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  create(
    @Body() dto: CreateSystemModuleDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.systemModulesService.create(dto, user.id);
  }

  /** Renombra el label o cambia si participa en plan∩categoría */
  @Patch(':module')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  update(
    @Param('module') module: string,
    @Body() dto: UpdateSystemModuleDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.systemModulesService.update(module, dto, user.id);
  }

  /** Elimina un módulo creado por un admin — los del sistema solo se deshabilitan */
  @Delete(':module')
  @UseGuards(RolesGuard)
  @Roles(Role.SUPERADMIN)
  remove(@Param('module') module: string) {
    return this.systemModulesService.remove(module);
  }
}
