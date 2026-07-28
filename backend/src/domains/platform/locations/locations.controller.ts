import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { CreateVeLocationDto } from './dto/create-ve-location.dto';
import { UpdateVeLocationDto } from './dto/update-ve-location.dto';

@Controller('locations/ve')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ─── Lectura pública (cualquier usuario autenticado, sin permiso especial) ──

  @Get('states')
  getStates() {
    return this.locationsService.getStates();
  }

  @Get('municipios')
  getMunicipios(@Query('state') state: string) {
    return this.locationsService.getMunicipios(state);
  }

  @Get('ciudades')
  getCiudades(@Query('municipioId') municipioId: string) {
    return this.locationsService.getCiudades(municipioId);
  }

  @Get('parroquias')
  getParroquias(@Query('ciudadId') ciudadId: string) {
    return this.locationsService.getParroquias(ciudadId);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Get('admin/tree')
  @RequirePermission('locations:view')
  getTree(@Query('state') state?: string) {
    return this.locationsService.getTree(state);
  }

  @Post()
  @RequirePermission('locations:manage')
  create(@Body() dto: CreateVeLocationDto) {
    return this.locationsService.create(dto);
  }

  @Put(':id')
  @RequirePermission('locations:manage')
  update(@Param('id') id: string, @Body() dto: UpdateVeLocationDto) {
    return this.locationsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('locations:manage')
  remove(@Param('id') id: string) {
    return this.locationsService.remove(id);
  }
}
