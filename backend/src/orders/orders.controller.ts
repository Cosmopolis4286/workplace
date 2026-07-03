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
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus } from '@prisma/client';

class PatchStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('mine')
  @RequirePermission('orders:view')
  getMyOrders(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string
  ) {
    return this.ordersService.getMyOrders(
      user.email,
      parseInt(page ?? '1'),
      parseInt(limit ?? '20'),
      status
    );
  }

  @Get('stats/mine')
  @RequirePermission('orders:view')
  getMyOrdersStats(@CurrentUser() user: any) {
    return this.ordersService.getMyOrdersStats(user.email);
  }

  @Get('stats')
  @RequirePermission('orders:view')
  async getStats(@CurrentUser() user: any) {
    const commerceId = await this.ordersService.getCommerceId(user.id);
    return this.ordersService.getStats(commerceId);
  }

  @Get()
  @RequirePermission('orders:view')
  async findAll(@CurrentUser() user: any, @Query() query: QueryOrdersDto) {
    const commerceId = await this.ordersService.getCommerceId(user.id);
    return this.ordersService.findAll(commerceId, query);
  }

  @Get(':id')
  @RequirePermission('orders:view')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.ordersService.getCommerceId(user.id);
    return this.ordersService.findOne(id, commerceId);
  }

  @Post()
  @RequirePermission('orders:create')
  async create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    const commerceId = await this.ordersService.getCommerceId(user.id);
    return this.ordersService.create(commerceId, dto, user.id);
  }

  @Put(':id')
  @RequirePermission('orders:edit')
  async update(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: UpdateOrderDto
  ) {
    const commerceId = await this.ordersService.getCommerceId(user.id);
    return this.ordersService.update(id, commerceId, dto);
  }

  @Patch(':id/status')
  @RequirePermission('orders:change_status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: PatchStatusDto
  ) {
    const commerceId = await this.ordersService.getCommerceId(user.id);
    return this.ordersService.updateStatus(
      id,
      commerceId,
      dto.status,
      dto.cancelReason
    );
  }

  @Delete(':id')
  @RequirePermission('orders:delete')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.ordersService.getCommerceId(user.id);
    return this.ordersService.remove(id, commerceId);
  }
}
