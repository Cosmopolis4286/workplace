import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CreateSupplierQuoteDto } from './dto/create-supplier-quote.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AccountTypeGuard } from '../../../common/guards/account-type.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireAccountType } from '../../../common/decorators/require-account-type.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CommerceResolverService } from '../../../common/commerce-resolver/commerce-resolver.service';

@UseGuards(JwtAuthGuard, PermissionsGuard, AccountTypeGuard)
@RequireAccountType('COMMERCE')
@Controller('suppliers')
export class SuppliersController {
  constructor(
    private readonly suppliersService: SuppliersService,
    private readonly commerceResolver: CommerceResolverService,
  ) {}

  @Get()
  @RequirePermission('suppliers:view')
  async findAll(@CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.suppliersService.findAll(commerceId);
  }

  @Get('compare/:productId')
  @RequirePermission('suppliers:view')
  async compareForProduct(@Param('productId') productId: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.suppliersService.compareForProduct(productId, commerceId);
  }

  @Get(':id')
  @RequirePermission('suppliers:view')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.suppliersService.findOne(id, commerceId);
  }

  @Get(':id/quotes')
  @RequirePermission('suppliers:view')
  async listQuotes(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.suppliersService.listQuotesForSupplier(id, commerceId);
  }

  @Post()
  @RequirePermission('suppliers:create')
  async create(@CurrentUser() user: any, @Body() dto: CreateSupplierDto) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.suppliersService.create(commerceId, dto);
  }

  @Post(':id/quotes')
  @RequirePermission('suppliers:create')
  async createQuote(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: CreateSupplierQuoteDto,
  ) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.suppliersService.createQuote(id, commerceId, dto);
  }

  @Put(':id')
  @RequirePermission('suppliers:edit')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateSupplierDto,
  ) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.suppliersService.update(id, commerceId, dto);
  }

  @Delete(':id')
  @RequirePermission('suppliers:delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.commerceResolver.resolve(user.id);
    return this.suppliersService.remove(id, commerceId);
  }
}
