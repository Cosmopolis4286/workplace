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
import { AccountPayablesService } from './account-payables.service';
import { CreatePayableDto } from './dto/create-payable.dto';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AccountTypeGuard } from '../../../common/guards/account-type.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireAccountType } from '../../../common/decorators/require-account-type.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, AccountTypeGuard)
@RequireAccountType('COMMERCE')
@Controller('accounts/payables')
export class AccountPayablesController {
  constructor(
    private readonly payablesService: AccountPayablesService,
    private readonly commerceResolver: CommerceResolverService,
  ) {}

  @Get()
  @RequirePermission('accounts:view')
  async findAll(@CurrentUser() user: any, @Query() query: QueryAccountsDto) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.payablesService.findAll(commerceId, query);
  }

  @Get(':id')
  @RequirePermission('accounts:view')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.payablesService.findOne(id, commerceId);
  }

  @Post()
  @RequirePermission('accounts:create')
  async create(@CurrentUser() user: any, @Body() dto: CreatePayableDto) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.payablesService.create(commerceId, user.id, dto);
  }

  @Patch(':id/paid')
  @RequirePermission('accounts:edit')
  async markAsPaid(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.payablesService.markAsPaid(id, commerceId);
  }

  @Delete(':id')
  @RequirePermission('accounts:delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.payablesService.remove(id, commerceId);
  }
}
