import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountReceivablesService } from './account-receivables.service';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { CapabilityGuard } from '../../../common/guards/capability.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireCapability } from '../../../common/decorators/require-capability.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, CapabilityGuard)
@RequireCapability('HAS_COMMERCE')
@Controller('accounts/receivables')
export class AccountReceivablesController {
  constructor(
    private readonly receivablesService: AccountReceivablesService,
    private readonly commerceResolver: CommerceResolverService
  ) {}

  @Get()
  @RequirePermission('accounts:view')
  async findAll(@CurrentUser() user: any, @Query() query: QueryAccountsDto) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.receivablesService.findAll(commerceId, query);
  }

  @Get(':id')
  @RequirePermission('accounts:view')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.receivablesService.findOne(id, commerceId);
  }

  @Get(':id/replacement-risk')
  @RequirePermission('accounts:view')
  async getReplacementRisk(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.receivablesService.getReplacementRisk(id, commerceId);
  }

  @Post()
  @RequirePermission('accounts:create')
  async create(@CurrentUser() user: any, @Body() dto: CreateReceivableDto) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.receivablesService.create(commerceId, user.id, dto);
  }

  @Patch(':id/paid')
  @RequirePermission('accounts:edit')
  async markAsPaid(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.receivablesService.markAsPaid(id, commerceId);
  }

  @Delete(':id')
  @RequirePermission('accounts:delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.receivablesService.remove(id, commerceId);
  }
}
