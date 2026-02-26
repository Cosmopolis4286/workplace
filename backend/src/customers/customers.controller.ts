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
} from '@nestjs/common'
import { CustomersService } from './customers.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('stats')
  getStats(@CurrentUser() user: { id: string }) {
    return this.customersService.getStats(user.id)
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.customersService.findAll(user.id)
  }

  @Get(':id')
  findOne(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.customersService.findOne(user.id, id)
  }

  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user.id, dto)
  }

  @Put(':id')
  update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user.id, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.customersService.remove(user.id, id)
  }

  @Patch(':id/toggle-status')
  toggleStatus(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.customersService.toggleStatus(user.id, id)
  }
}
