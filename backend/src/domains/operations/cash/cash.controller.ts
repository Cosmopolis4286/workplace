import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CashService } from './cash.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CreateMovementDto } from './dto/create-movement.dto';
import { QuerySessionsDto } from './dto/query-sessions.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
@RequireCapability('HAS_COMMERCE')
@Controller('cash')
export class CashController {
  constructor(private readonly cashService: CashService) {}

  @Get('current')
  @RequirePermission('cash:view')
  async getCurrent(@CurrentUser() user: any) {
    const commerceId = await this.cashService.getCommerceId(user.id);
    return this.cashService.getCurrent(commerceId);
  }

  @Post('open')
  @RequirePermission('cash:manage')
  async open(@CurrentUser() user: any, @Body() dto: OpenSessionDto) {
    const commerceId = await this.cashService.getCommerceId(user.id);
    const openedBy =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
    return this.cashService.open(commerceId, openedBy, dto);
  }

  @Post('close')
  @RequirePermission('cash:manage')
  async close(@CurrentUser() user: any, @Body() dto: CloseSessionDto) {
    const commerceId = await this.cashService.getCommerceId(user.id);
    const closedBy =
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email;
    return this.cashService.close(commerceId, closedBy, dto);
  }

  @Post('movements')
  @RequirePermission('cash:manage')
  async addMovement(@CurrentUser() user: any, @Body() dto: CreateMovementDto) {
    const commerceId = await this.cashService.getCommerceId(user.id);
    return this.cashService.addMovement(commerceId, dto);
  }

  @Get('sessions')
  @RequirePermission('cash:view')
  async findAll(@CurrentUser() user: any, @Query() query: QuerySessionsDto) {
    const commerceId = await this.cashService.getCommerceId(user.id);
    return this.cashService.findAll(commerceId, query);
  }

  @Get('sessions/:id')
  @RequirePermission('cash:view')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.cashService.getCommerceId(user.id);
    return this.cashService.findOne(id, commerceId);
  }
}
