import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

// Roles that ADMIN is NOT allowed to manage
const ADMIN_RESTRICTED_ROLES: Role[] = [Role.SUPERADMIN, Role.ADMIN];

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async findAll(
    @CurrentUser() caller: { id: string; role: Role },
    @Query('role') roleFilter?: Role,
    @Query('categoryId') categoryId?: string,
    @Query('subcategoryId') subcategoryId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20'
  ) {
    const allowedRoles =
      caller.role === Role.SUPERADMIN
        ? undefined // all roles
        : [Role.COMMERCE, Role.FREELANCER, Role.NORMAL];

    return this.usersService.findAllUsers({
      roleFilter:
        allowedRoles &&
        roleFilter &&
        (allowedRoles as Role[]).includes(roleFilter)
          ? roleFilter
          : allowedRoles
            ? undefined // will be filtered by allowedRoles below
            : roleFilter,
      allowedRoles,
      categoryId,
      subcategoryId,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }

  // ─── Categories endpoints ──────────────────────────────────────────────────

  @Get('categories')
  @UseGuards(JwtAuthGuard)
  getCategories() {
    return this.usersService.findAllCategories();
  }

  @Get('categories/:categoryId/subcategories')
  @UseGuards(JwtAuthGuard)
  getSubcategories(@Param('categoryId') categoryId: string) {
    return this.usersService.findSubcategoriesByCategory(categoryId);
  }

  @Get('subcategories')
  @UseGuards(JwtAuthGuard)
  getAllSubcategories() {
    return this.usersService.findAllSubcategories();
  }

  @Post('categories')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createCategory(
    @Body() body: { name: string; icon?: string; allowedModules?: string[] }
  ) {
    return this.usersService.createCategory(body);
  }

  @Put('categories/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateCategory(
    @Param('id') id: string,
    @Body() body: { name?: string; icon?: string; allowedModules?: string[] }
  ) {
    return this.usersService.updateCategory(id, body);
  }

  @Delete('categories/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  deleteCategory(@Param('id') id: string) {
    return this.usersService.deleteCategory(id);
  }

  // ─── Subcategories endpoints ───────────────────────────────────────────────

  @Post('categories/:categoryId/subcategories')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  createSubcategory(
    @Param('categoryId') categoryId: string,
    @Body() body: { name: string }
  ) {
    return this.usersService.createSubcategory(categoryId, body);
  }

  @Put('subcategories/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  updateSubcategory(@Param('id') id: string, @Body() body: { name: string }) {
    return this.usersService.updateSubcategory(id, body);
  }

  @Delete('subcategories/:id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  deleteSubcategory(@Param('id') id: string) {
    return this.usersService.deleteSubcategory(id);
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role }
  ) {
    const target = await this.usersService.findById(id);
    if (
      caller.role === Role.ADMIN &&
      ADMIN_RESTRICTED_ROLES.includes(target.role as Role)
    ) {
      throw new ForbiddenException('No tienes permisos para ver este usuario');
    }
    return target;
  }

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() caller: { id: string; role: Role }
  ) {
    if (
      caller.role === Role.ADMIN &&
      ADMIN_RESTRICTED_ROLES.includes(dto.role)
    ) {
      throw new ForbiddenException('No puedes crear usuarios con ese rol');
    }
    return this.usersService.createUser(dto);
  }

  @Put(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() caller: { id: string; role: Role }
  ) {
    const target = await this.usersService.findById(id);
    if (
      caller.role === Role.ADMIN &&
      ADMIN_RESTRICTED_ROLES.includes(target.role as Role)
    ) {
      throw new ForbiddenException(
        'No tienes permisos para editar este usuario'
      );
    }
    if (
      dto.role &&
      caller.role === Role.ADMIN &&
      ADMIN_RESTRICTED_ROLES.includes(dto.role)
    ) {
      throw new ForbiddenException('No puedes asignar ese rol');
    }
    return this.usersService.updateUser(id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateOwnProfile(
    @Param('id') id: string,
    @Body() dto: { categoryId?: string },
    @CurrentUser() caller: { id: string; role: Role }
  ) {
    if (caller.id !== id) {
      throw new ForbiddenException('Solo puedes editar tu propio perfil');
    }
    return this.usersService.updateUser(id, dto);
  }

  @Patch(':id/toggle-status')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async toggleStatus(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role }
  ) {
    const target = await this.usersService.findById(id);
    if (
      caller.role === Role.ADMIN &&
      ADMIN_RESTRICTED_ROLES.includes(target.role as Role)
    ) {
      throw new ForbiddenException(
        'No tienes permisos para modificar este usuario'
      );
    }
    return this.usersService.toggleUserStatus(id);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async remove(
    @Param('id') id: string,
    @CurrentUser() caller: { id: string; role: Role }
  ) {
    const target = await this.usersService.findById(id);
    if (
      caller.role === Role.ADMIN &&
      ADMIN_RESTRICTED_ROLES.includes(target.role as Role)
    ) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar este usuario'
      );
    }
    return this.usersService.deleteUser(id);
  }
}
