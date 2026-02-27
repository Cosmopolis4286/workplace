import {
  Controller, Get, Post, Put, Delete, Patch, Param, Body, Query, UseGuards
} from '@nestjs/common'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { QueryOrdersDto } from './dto/query-orders.dto'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { IsEnum, IsOptional, IsString } from 'class-validator'
import { OrderStatus } from '@prisma/client'

class PatchStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus

  @IsOptional()
  @IsString()
  cancelReason?: string
}

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('stats')
  getStats(@CurrentUser() user: any) {
    return this.ordersService.getStats(user.restaurantId)
  }

  @Get()
  findAll(@CurrentUser() user: any, @Query() query: QueryOrdersDto) {
    return this.ordersService.findAll(user.restaurantId, query)
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.findOne(id, user.restaurantId)
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.restaurantId, dto)
  }

  @Put(':id')
  update(@Param('id') id: string, @CurrentUser() user: any, @Body() dto: UpdateOrderDto) {
    return this.ordersService.update(id, user.restaurantId, dto)
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body() dto: PatchStatusDto,
  ) {
    return this.ordersService.updateStatus(id, user.restaurantId, dto.status, dto.cancelReason)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.ordersService.remove(id, user.restaurantId)
  }
}
