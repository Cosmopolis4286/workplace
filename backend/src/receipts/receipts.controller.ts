import { Controller, Get, Post, Param, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly prisma: PrismaService
  ) {}

  private async getCommerceId(userId: string): Promise<string> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { userId },
      select: { id: true },
    });
    return restaurant?.id ?? userId;
  }

  @Post()
  @RequirePermission('orders:view')
  async create(@CurrentUser() user: any, @Body() dto: CreateReceiptDto) {
    const commerceId = await this.getCommerceId(user.id);
    return this.receiptsService.create(commerceId, dto.orderId);
  }

  @Get('by-order/:orderId')
  @RequirePermission('orders:view')
  async findByOrder(@Param('orderId') orderId: string, @CurrentUser() user: any) {
    const commerceId = await this.getCommerceId(user.id);
    return this.receiptsService.findByOrder(orderId, commerceId);
  }

  @Get(':id')
  @RequirePermission('orders:view')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const commerceId = await this.getCommerceId(user.id);
    return this.receiptsService.findOne(id, commerceId);
  }

  @Get(':id/pdf')
  @RequirePermission('orders:view')
  async downloadPdf(@Param('id') id: string, @CurrentUser() user: any, @Res() res: Response) {
    const commerceId = await this.getCommerceId(user.id);
    const receipt = await this.receiptsService.findOne(id, commerceId);
    const pdf = await this.receiptsService.generatePdf(id, commerceId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${receipt.receiptNumber}.pdf"`);
    res.send(pdf);
  }
}
