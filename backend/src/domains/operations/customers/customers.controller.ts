import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { AccountTypeGuard } from '../../../common/guards/account-type.guard';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RequireAccountType } from '../../../common/decorators/require-account-type.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard, AccountTypeGuard)
@RequireAccountType('COMMERCE')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('stats')
  @RequirePermission('customers:view')
  getStats(@CurrentUser() user: { id: string }) {
    return this.customersService.getStats(user.id);
  }

  @Get()
  @RequirePermission('customers:view')
  findAll(@CurrentUser() user: { id: string }) {
    return this.customersService.findAll(user.id);
  }

  @Get(':id')
  @RequirePermission('customers:view')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.customersService.findOne(user.id, id);
  }

  @Post()
  @RequirePermission('customers:create')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user.id, dto);
  }

  @Put(':id')
  @RequirePermission('customers:edit')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto
  ) {
    return this.customersService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('customers:delete')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.customersService.remove(user.id, id);
  }

  @Patch(':id/toggle-status')
  @RequirePermission('customers:edit')
  toggleStatus(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.customersService.toggleStatus(user.id, id);
  }
}
